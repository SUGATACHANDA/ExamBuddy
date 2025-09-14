import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAuth } from "../context/AuthContext"

// A helper component for table headers that allows sorting
const SortableHeader = ({ children, sortConfig, onSort, columnKey }) => {
    const isSorted = sortConfig.key === columnKey;
    const directionClass = isSorted ? (sortConfig.direction === 'ascending' ? 'asc' : 'desc') : '';

    return (
        <th onClick={() => onSort(columnKey)} className={`sortable ${directionClass}`}>
            {children}
        </th>
    );
};


// The Main Results Screen Component
const ResultsScreen = () => {
    const { examId } = useParams();
    const [results, setResults] = useState([]);
    const [exam, setExam] = useState(null); // To store exam details like the title
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'descending' });
    const { userInfo } = useAuth();

    const getBackUrl = () => {
        if (userInfo?.role === 'HOD') {
            return '/hod/exams';
        }
        // Default for teachers or any other case
        return '/teacher/exams';
    };

    const backUrl = getBackUrl();

    const summaryStats = useMemo(() => {
        // If there are no results, return default zero values.
        if (!results || results.length === 0) {
            return {
                averageScore: 0,
                highestScore: 0,
                totalMarks: 'N/A'
            };
        }

        // Calculate the total score for the average calculation.
        const totalScore = results.reduce((acc, result) => acc + (result.score || 0), 0);

        // Use Math.max to find the highest score among all submissions.
        // We map over the scores and spread them as arguments to Math.max.
        const highestScore = Math.max(...results.map(result => result.score || 0));

        return {
            averageScore: (totalScore / results.length).toFixed(2),
            highestScore: highestScore,
            // The total possible marks should be the same for all results, so we can safely take it from the first entry.
            totalMarks: results[0].totalMarks
        };
    }, [results]);

    // --- Data Fetching ---
    useEffect(() => {
        const fetchResults = async () => {
            try {
                setLoading(true);
                const { data } = await api.get(`/results/exam/${examId}`);

                // --- THIS IS THE DEFINITIVE FIX ---
                // We will validate the data from the API before setting state.

                // Check if the API returned valid data and if `data.results` is an array.
                if (data && Array.isArray(data.results)) {
                    setResults(data.results);
                } else {
                    // If the response is not what we expect, set results to an empty array
                    // to prevent crashes, and log a warning.
                    console.warn("API response for results was missing or not an array:", data);
                    setResults([]);
                }

                // Also, safely set the exam object
                if (data && typeof data.exam === 'object') {
                    setExam(data.exam);
                } else {
                    setExam(null);
                }
                // ------------------------------------

            } catch (err) {
                // If the entire API call fails (e.g., 404, 500), also ensure results is an empty array.
                console.error("Failed to fetch exam results:", err);
                setError(err.response?.data?.message || 'Failed to fetch exam results.');
                setResults([]); // <--- Important failsafe
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [examId]);


    // --- Sorting Logic (Memoized for performance) ---
    const sortedResults = useMemo(() => {
        let sortableItems = [...results];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle nested properties like student.name
                if (sortConfig.key === 'student.name') {
                    aValue = a.student?.name || '';
                    bValue = b.student?.name || '';
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [results, sortConfig]);

    const handleSort = useCallback((key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    }, [sortConfig]);


    // --- Summary Calculations ---
    // const averageScore = useMemo(() => {
    //     if (results.length === 0) return 0;
    //     const totalScore = results.reduce((acc, result) => acc + result.score, 0);
    //     return (totalScore / results.length).toFixed(2);
    // }, [results]);


    if (loading) {
        return <div className="container"><p>Loading results...</p></div>;
    }

    if (error) {
        return <div className="container error"><p>{error}</p></div>;
    }

    return (
        <div className="container">
            <Link to={backUrl} className="btn-link">&larr; Back to Exams List</Link>
            <h1>Results for: {exam?.title || 'Exam'}</h1>
            <p><strong>Subject:</strong> {exam?.subject || 'N/A'}</p>

            {/* --- Summary Cards --- */}
            <div className="summary-cards">
                <div className="summary-card">
                    <h4>Total Submissions</h4>
                    <p>{results.length}</p>
                </div>
                <div className="summary-card">
                    <h4>Class Highest Score</h4>
                    <p>{summaryStats.highestScore}</p>
                </div>
                <div className="summary-card">
                    <h4>Total Marks</h4>
                    <p>{summaryStats.totalMarks}</p>
                </div>
                <div className="summary-card">
                    <h4>Class Average</h4>
                    <p>{summaryStats.averageScore}</p>
                </div>
            </div>

            {/* --- Results Table --- */}
            {sortedResults.length > 0 ? (
                <table className="results-table">
                    <thead>
                        <tr>
                            <SortableHeader sortConfig={sortConfig} onSort={handleSort} columnKey="student.name">
                                Student Name
                            </SortableHeader>
                            <SortableHeader sortConfig={sortConfig} onSort={handleSort} columnKey="student.collegeId">
                                College ID
                            </SortableHeader>
                            <SortableHeader sortConfig={sortConfig} onSort={handleSort} columnKey="score">
                                Score
                            </SortableHeader>
                            <SortableHeader sortConfig={sortConfig} onSort={handleSort} columnKey="updatedAt">
                                Submission Time
                            </SortableHeader>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedResults.map((result) => (
                            <tr key={result._id}>
                                <td>{result.student?.name || 'N/A'}</td>
                                <td>{result.student?.collegeId || 'N/A'}</td>
                                <td>{result.score} / {result.totalMarks}</td>
                                <td>{new Date(result.updatedAt).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>No students have submitted this exam yet.</p>
            )}
        </div>
    );
};

export default ResultsScreen;
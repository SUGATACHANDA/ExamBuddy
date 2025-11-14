import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAuth } from "../context/AuthContext"
import LoadingScreen from 'components/LoadingScreen';

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
    const [searchTerm, setSearchTerm] = useState('');
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
    const filteredAndSortedResults = useMemo(() => {
        let filteredItems = [...results];

        // 1. Apply the search filter first
        if (searchTerm.trim() !== '') {
            filteredItems = filteredItems.filter(result =>
                // Check student name or college ID. Using `?.` for safety.
                result.student?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                result.student?.collegeId.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // 2. Then, sort the already filtered list
        if (sortConfig.key) {
            filteredItems.sort((a, b) => {
                let aValue = a;
                let bValue = b;
                // Allow sorting by nested properties like student.name
                sortConfig.key.split('.').forEach(keyPart => {
                    aValue = aValue?.[keyPart];
                    bValue = bValue?.[keyPart];
                });

                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }

        return filteredItems;
    }, [results, searchTerm, sortConfig]);;

    const handleSort = useCallback((key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    }, [sortConfig]);


    if (error) {
        return <div className="container error"><p>{error}</p></div>;
    }

    return (
        <>
            {loading && <LoadingScreen />}
            <div className="container">
                <Link to={backUrl} className="btn-link">&larr; Back to Exams List</Link>
                <h1>Results for: {exam?.title || 'Exam'}</h1>
                <p><strong>Subject:</strong> {results[0]?.subject?.name || "N/A"}</p>

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

                <div className="search-bar-container">
                    <input
                        type="search" // Use type="search" for better semantics
                        placeholder="Search by student name or college ID..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                {/* --- Results Table --- */}
                {filteredAndSortedResults.length > 0 ? (
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
                                <SortableHeader sortConfig={sortConfig} onSort={handleSort} columnKey="status">
                                    Status
                                </SortableHeader>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedResults.map((result) => (
                                <tr key={result._id}>
                                    <td>{result.student?.name || 'N/A'}</td>
                                    <td>{result.student?.collegeId || 'N/A'}</td>
                                    <td>{result.score} / {result.totalMarks}</td>
                                    <td>{new Date(result.updatedAt).toLocaleString()}</td>
                                    <td className={result.status === 'completed' ? 'success-status' : 'failure-status'}>{(result.status).toUpperCase()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No students have submitted this exam yet.</p>
                )}
            </div>
        </>

    );
};

export default ResultsScreen;
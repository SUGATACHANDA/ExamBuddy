import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
// Import the reusable Pagination component. Adjust the path if you placed it elsewhere.
import Pagination from '../components/teacher/Pagination';

const MyResultsScreen = () => {
    const [allResults, setAllResults] = useState([]); // Store the full list of results here
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // --- NEW STATE FOR PAGINATION ---
    const [currentPage, setCurrentPage] = useState(1);
    const resultsPerPage = 1; // Configurable number of results to show per page

    // --- Data Fetching ---
    useEffect(() => {
        const fetchResults = async () => {
            try {
                const { data } = await api.get('/results/my-results');
                setAllResults(data);
            } catch (err) {
                setError('Failed to load your past results.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, []);

    // --- Memoized Filtering and Pagination Logic ---

    // This useMemo hook filters the results based on the search term first.
    const filteredResults = useMemo(() => {
        if (!searchTerm.trim()) {
            return allResults;
        }
        return allResults.filter(result =>
            result.exam?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            result.exam?.subject.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allResults, searchTerm]);

    // This useMemo hook paginates the *filtered* results.
    const paginatedResults = useMemo(() => {
        const startIndex = (currentPage - 1) * resultsPerPage;
        return filteredResults.slice(startIndex, startIndex + resultsPerPage);
    }, [filteredResults, currentPage, resultsPerPage]);

    // Calculate the total number of pages based on the filtered results.
    const totalPages = Math.ceil(filteredResults.length / resultsPerPage);

    // When the search term changes, reset to the first page.
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);


    if (loading) {
        return <div className="container"><p>Loading your results...</p></div>;
    }

    if (error) {
        return <div className="container"><p className="error">{error}</p></div>;
    }

    return (
        <div className="container">
            <Link to="/student/dashboard" className="btn-link">&larr; Back to Dashboard</Link>
            <h1>My Past Exam Results</h1>

            <div className="search-bar-container">
                <input
                    type="text"
                    placeholder="Search results by exam title or subject..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>

            {/* RENDER LOGIC */}
            {allResults.length === 0 ? (
                <p>You have not completed any exams yet.</p>
            ) : filteredResults.length === 0 ? (
                <p>No results found for your search term: "{searchTerm}"</p>
            ) : (
                <>
                    {/* The grid now renders the paginated list */}
                    <div className="results-grid">
                        {paginatedResults.map(result => {
                            const isExpelled = result.status === 'expelled';
                            const percentage = isExpelled ? 0 : ((result.score / result.totalMarks) * 100).toFixed(0);
                            return (

                                <div key={result._id} className="result-card">
                                    <h3>{result.exam?.title || 'Exam Title Unavailable'}</h3>
                                    <p className="result-subject">{result.exam?.subject || 'N/A'}</p>
                                    {isExpelled ? (
                                        <div className="result-score-container expelled-info">
                                            <span className="score-label">Status</span>
                                            <span className="expelled-text">EXPELLED</span>
                                        </div>
                                    ) : (
                                        <div className="result-score-container">
                                            <span className="score-label">You Scored</span>
                                            <span className="score-value">{result.score} / {result.totalMarks}</span>
                                            <span className="score-percent">{percentage}%</span>
                                        </div>
                                    )}
                                    <p className="result-timestamp">
                                        Completed on: {new Date(result.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            )
                        })}
                    </div>

                    {/* The Pagination component is rendered below the grid */}
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </>
            )}
        </div>
    );
};

export default MyResultsScreen;
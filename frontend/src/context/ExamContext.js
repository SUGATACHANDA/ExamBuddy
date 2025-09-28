// ExamContext.js
import React, { createContext, useContext, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";

const ExamContext = createContext();

const AnswerStatus = {
    NOT_ANSWERED: 'notAnswered',
    ANSWERED: 'answered',
    MARKED_FOR_REVIEW: 'markedForReview',
    ANSWERED_AND_MARKED: 'answeredAndMarked',
};

export const ExamProvider = ({ examId, children }) => {
    const [sections, setSections] = useState([]);
    const [answers, setAnswers] = useState([]);
    const [screenState, setScreenState] = useState("IN_PROGRESS");
    const [error, setError] = useState(null);

    const navigate = useNavigate();

    const submitExam = useCallback(async () => {
        if (screenState === "FINISHED" || screenState === "EXPELLED") return;
        setScreenState("FINISHED");

        const answersForEvaluation = answers.filter(
            (ans) =>
                ans.status === AnswerStatus.ANSWERED ||
                ans.status === AnswerStatus.ANSWERED_AND_MARKED
        );

        try {
            await api.post("/results/submit", { examId, answers: answersForEvaluation });
            if (window.electronAPI) window.electronAPI.examFinished();
            sessionStorage.removeItem(`exam_setup_complete_${examId}`);
            navigate("/submission-success");
        } catch (err) {
            setError("Failed to submit exam. Please contact support.");
            console.error(err);
        }
    }, [answers, examId, navigate, screenState]);

    return (
        <ExamContext.Provider
            value={{
                sections,
                setSections,
                answers,
                setAnswers,
                screenState,
                setScreenState,
                error,
                submitExam,
            }}
        >
            {children}
        </ExamContext.Provider>
    );
};

export const useExam = () => useContext(ExamContext);

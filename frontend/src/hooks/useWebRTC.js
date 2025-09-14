// src/hooks/useWebRTC.js
import { useEffect, useRef, useCallback, useState } from 'react';
import io from 'socket.io-client';
import { useImmer } from 'use-immer';

// const SERVER_URL = 'https://exam-app-backend-sable.vercel.app';
const SERVER_URL = 'http://localhost:3000';
const STUN_SERVER = 'stun:stun.l.google.com:19302';

export const useWebRTC = (examId, user) => {
    const [peers, setPeers] = useImmer([]);
    const socketRef = useRef(null);
    const peerConnectionsRef = useRef({});
    const localStreamRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

    const getPeerConnection = useCallback((peerSocketId) => {
        if (peerConnectionsRef.current[peerSocketId]) {
            return peerConnectionsRef.current[peerSocketId];
        }

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: STUN_SERVER }]
        });

        pc.onnegotiationneeded = async () => {
            console.log(`[${user.role}] Negotiation needed for peer ${peerSocketId}`);
            if (user.role === 'teacher') {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socketRef.current.emit('webrtc_offer', { offer, targetSocketId: peerSocketId });
                } catch (err) {
                    console.error("Error creating offer:", err);
                }
            }
        };

        pc.ontrack = (event) => {
            console.log(`[${user.role}] Received remote track from ${peerSocketId}`);
            setPeers(draft => {
                const peer = draft.find(p => p.socketId === peerSocketId);
                if (peer) {
                    peer.stream = event.streams[0];
                } else {
                    draft.push({ socketId: peerSocketId, stream: event.streams[0] });
                }
            });
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit('webrtc_ice_candidate', {
                    candidate: event.candidate,
                    targetSocketId: peerSocketId,
                });
            }
        };

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });
        }

        peerConnectionsRef.current[peerSocketId] = pc;
        return pc;
    }, [user.role, setPeers]);

    useEffect(() => {
        const setupWebRTC = async () => {
            try {
                // Get user media first
                localStreamRef.current = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });

                // Connect to socket
                socketRef.current = io(SERVER_URL, {
                    transports: ['websocket'],
                    path: '/socket.io/'
                });

                // Join appropriate room
                if (user.role === 'teacher') {
                    socketRef.current.emit('join_proctoring_room', examId);
                } else {
                    socketRef.current.emit('join_exam_room', {
                        examId,
                        studentId: user._id,
                        studentName: user.name
                    });
                }

                // Setup socket listeners (same as before)
                socketRef.current.on('student_joined', ({ studentName, socketId }) => {
                    if (user.role === 'teacher') {
                        console.log(`Teacher sees student ${studentName} (${socketId}) joined.`);
                        getPeerConnection(socketId);
                        setPeers(draft => {
                            if (!draft.some(p => p.socketId === socketId)) {
                                draft.push({ socketId, studentName });
                            }
                        });
                    }
                });

                socketRef.current.on('webrtc_offer', async ({ offer, fromSocketId }) => {
                    if (user.role === 'student') {
                        console.log(`Student received offer from proctor ${fromSocketId}.`);
                        const pc = getPeerConnection(fromSocketId);
                        await pc.setRemoteDescription(new RTCSessionDescription(offer));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        socketRef.current.emit('webrtc_answer', { answer, targetSocketId: fromSocketId });
                    }
                });

                socketRef.current.on('webrtc_answer', async ({ answer, fromSocketId }) => {
                    if (user.role === 'teacher') {
                        console.log(`Teacher received answer from student ${fromSocketId}.`);
                        const pc = getPeerConnection(fromSocketId);
                        await pc.setRemoteDescription(new RTCSessionDescription(answer));
                    }
                });

                socketRef.current.on('webrtc_ice_candidate', async ({ candidate, fromSocketId }) => {
                    const pc = getPeerConnection(fromSocketId);
                    if (pc.remoteDescription) {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                });

                socketRef.current.on('peer_disconnected', (socketId) => {
                    console.log(`Peer ${socketId} disconnected.`);
                    if (peerConnectionsRef.current[socketId]) {
                        peerConnectionsRef.current[socketId].close();
                        delete peerConnectionsRef.current[socketId];
                    }
                    setPeers(draft => draft.filter(p => p.socketId !== socketId));
                });

                setIsConnected(true);

            } catch (err) {
                console.error("Error in WebRTC setup:", err);
            }
        };

        setupWebRTC();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
        };
    }, [examId, user, getPeerConnection, setPeers]);

    return {
        peers,
        localStream: localStreamRef.current,
        isConnected
    };
};
#!/bin/bash

# Create BarcodeScannerModal.jsx
mkdir -p src/components
cat << 'INNER_EOF' > src/components/BarcodeScannerModal.jsx
import React, { useEffect, useRef, useState } from 'react';
import { FiX, FiCameraOff } from 'react-icons/fi';
import { toast } from 'sonner';

const BarcodeScannerModal = ({ onClose, onScan }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [error, setError] = useState(null);
    const [hasStarted, setHasStarted] = useState(false);

    useEffect(() => {
        let animationFrameId;

        const startCamera = async () => {
            try {
                if (!('BarcodeDetector' in window)) {
                    throw new Error('BarcodeDetector API no está soportada en este navegador.');
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });

                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.setAttribute('playsinline', true); // Safari
                    await videoRef.current.play();
                    setHasStarted(true);

                    const barcodeDetector = new window.BarcodeDetector({
                        formats: ['ean_13', 'ean_8', 'qr_code', 'code_128', 'code_39']
                    });

                    const detectCode = async () => {
                        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                            try {
                                const barcodes = await barcodeDetector.detect(videoRef.current);
                                if (barcodes.length > 0) {
                                    // Beep sound or vibrate
                                    if (navigator.vibrate) {
                                        navigator.vibrate(100);
                                    } else {
                                        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                                        const oscillator = audioCtx.createOscillator();
                                        oscillator.type = 'sine';
                                        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
                                        oscillator.connect(audioCtx.destination);
                                        oscillator.start();
                                        oscillator.stop(audioCtx.currentTime + 0.1);
                                    }

                                    onScan(barcodes[0].rawValue);
                                    // Stop detection after first successful scan to avoid multiple firing
                                    return;
                                }
                            } catch (e) {
                                console.error("Error detecting barcode:", e);
                            }
                        }
                        animationFrameId = requestAnimationFrame(detectCode);
                    };

                    detectCode();
                }
            } catch (err) {
                console.error("Camera error:", err);
                setError(err.message || "Error al acceder a la cámara.");
            }
        };

        startCamera();

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative bg-white w-full max-w-md m-4 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[70vh] max-h-[600px]">
                <div className="flex justify-between items-center p-4 bg-gray-800 text-white">
                    <h3 className="font-bold text-lg">Escanear Código</h3>
                    <button onClick={onClose} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors">
                        <FiX size={24} />
                    </button>
                </div>

                <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                    {error ? (
                        <div className="text-center p-6 text-white flex flex-col items-center">
                            <FiCameraOff size={48} className="text-red-500 mb-4" />
                            <p className="font-semibold text-lg">{error}</p>
                            <p className="text-gray-400 mt-2 text-sm">Asegúrate de que tu navegador soporta BarcodeDetector API y tiene permisos de cámara.</p>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                            {/* Overlay target frame */}
                            {hasStarted && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                                    <div className="w-64 h-48 border-4 border-green-500/50 rounded-xl relative">
                                        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                    </div>
                                </div>
                            )}
                            {!hasStarted && !error && (
                                <div className="text-white">Iniciando cámara...</div>
                            )}
                        </>
                    )}
                </div>
                <div className="p-4 bg-gray-100 text-center text-sm text-gray-600 font-medium">
                    Encuadra el código de barras en el área marcada
                </div>
            </div>
        </div>
    );
};

export default BarcodeScannerModal;
INNER_EOF

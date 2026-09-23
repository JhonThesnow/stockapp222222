import React, { useEffect, useRef, useState } from 'react';

const NativeScannerModal = ({ onClose, onScan }) => {
    const videoRef = useRef(null);
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
                    await videoRef.current.play();
                    setHasStarted(true);

                    const barcodeDetector = new window.BarcodeDetector({
                        formats: ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128']
                    });

                    const detectCode = async () => {
                        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                            try {
                                const barcodes = await barcodeDetector.detect(videoRef.current);
                                if (barcodes.length > 0) {
                                    onScan(barcodes[0].rawValue);
                                    return; // Stop loop after successful scan
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative bg-white w-full max-w-md m-4 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[70vh] max-h-[600px]">
                <div className="flex justify-between items-center p-4 bg-gray-800 text-white">
                    <h3 className="font-bold text-lg">Escanear Código</h3>
                    <button onClick={onClose} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                    {error ? (
                        <div className="text-center p-6 text-white flex flex-col items-center">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 mb-4">
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9"></path>
                                <circle cx="12" cy="13" r="4"></circle>
                            </svg>
                            <p className="font-semibold text-lg">{error}</p>
                            <p className="text-gray-400 mt-2 text-sm">Asegúrate de que tu navegador soporta BarcodeDetector API y tiene permisos de cámara.</p>
                        </div>
                    ) : (
                        <>
                            <video
                                id="scanner-video"
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="absolute inset-0 w-full h-full object-cover"
                            />
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

export default NativeScannerModal;

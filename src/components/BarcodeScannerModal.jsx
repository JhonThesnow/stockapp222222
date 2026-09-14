import React, { useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';

const BarcodeScannerModal = ({ onDetected, onClose }) => {
    const videoRef = useRef(null);
    const codeReaderRef = useRef(null);

    useEffect(() => {
        let stream = null;
        let animationFrameId = null;

        const startNativeScanner = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }

                const barcodeDetector = new window.BarcodeDetector({
                    formats: ['ean_13', 'ean_8', 'code_128', 'qr_code', 'upc_a', 'upc_e']
                });

                const detect = async () => {
                    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
                        animationFrameId = requestAnimationFrame(detect);
                        return;
                    }

                    try {
                        const barcodes = await barcodeDetector.detect(videoRef.current);
                        if (barcodes.length > 0) {
                            navigator.vibrate?.(100);
                            onDetected(barcodes[0].rawValue);
                            return; // Stop detection loop once found
                        }
                    } catch (e) {
                        console.error('Barcode detection failed:', e);
                    }
                    animationFrameId = requestAnimationFrame(detect);
                };

                detect();
            } catch (error) {
                console.error('Error starting native scanner:', error);
                startZXingScanner(); // Fallback
            }
        };

        const startZXingScanner = async () => {
            if (typeof window.ZXing === 'undefined') {
                console.error("ZXing library not found!");
                alert("La librería de escaneo no se pudo cargar. Refresca la página.");
                onClose();
                return;
            }

            codeReaderRef.current = new window.ZXing.BrowserMultiFormatReader();

            try {
                const videoInputDevices = await codeReaderRef.current.listVideoInputDevices();
                if (videoInputDevices.length > 0) {
                    const rearCamera = videoInputDevices.find(device => device.label.toLowerCase().includes('back')) || videoInputDevices[0];

                    codeReaderRef.current.decodeFromVideoDevice(rearCamera.deviceId, videoRef.current, (result, err) => {
                        if (result) {
                            navigator.vibrate?.(100);
                            onDetected(result.getText());
                        }
                        if (err && !(err instanceof window.ZXing.NotFoundException)) {
                            console.error(err);
                        }
                    });
                } else {
                    alert("No se encontró ninguna cámara.");
                    onClose();
                }
            } catch (error) {
                console.error("Error al iniciar el escáner:", error);
                alert("No se pudo acceder a la cámara. Asegúrate de haber dado los permisos necesarios.");
                onClose();
            }
        };

        if ('BarcodeDetector' in window) {
            startNativeScanner();
        } else {
            startZXingScanner();
        }

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (codeReaderRef.current) {
                codeReaderRef.current.reset();
            }
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject = null;
            }
        };
    }, [onDetected, onClose]);

    return (
        <div className="fixed inset-0 bg-black flex justify-center items-center z-50">
            <div className="relative w-full h-full max-w-lg max-h-[80vh] bg-gray-900 rounded-lg overflow-hidden">
                <video ref={videoRef} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex justify-center items-center">
                    <div className="w-3/4 h-1/3 border-4 border-red-500 rounded-lg animate-pulse"></div>
                </div>
                <button onClick={onClose} className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg">
                    <FiX size={24} className="text-gray-800" />
                </button>
            </div>
        </div>
    );
};

export default BarcodeScannerModal;

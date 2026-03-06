import React, { useState, useRef } from 'react';
import { Image as ImageIcon, FileSpy, ShieldAlert, UploadCloud, Download, Copy, CheckCircle2 } from 'lucide-react';
import { encodeMessage, decodeMessage } from '../stego/lsb';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('encode');

    // Encode State
    const [encodeImage, setEncodeImage] = useState(null);
    const [encodePreview, setEncodePreview] = useState(null);
    const [secretMessage, setSecretMessage] = useState('');
    const [encodedResult, setEncodedResult] = useState(null);
    const [encodeError, setEncodeError] = useState('');

    // Decode State
    const [decodeImage, setDecodeImage] = useState(null);
    const [decodePreview, setDecodePreview] = useState(null);
    const [decodedMessage, setDecodedMessage] = useState('');
    const [decodeError, setDecodeError] = useState('');

    const [copied, setCopied] = useState(false);

    const handleEncodeImageLoad = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setEncodeImage(file);
        setEncodePreview(URL.createObjectURL(file));
        setEncodedResult(null);
        setEncodeError('');
    };

    const handleDecodeImageLoad = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setDecodeImage(file);
        setDecodePreview(URL.createObjectURL(file));
        setDecodedMessage('');
        setDecodeError('');
    };

    const handleEncode = () => {
        if (!encodeImage || !secretMessage) return;
        try {
            const img = new Image();
            img.onload = () => {
                try {
                    const resultDataUrl = encodeMessage(img, secretMessage);
                    setEncodedResult(resultDataUrl);
                    setEncodeError('');
                } catch (err) {
                    setEncodeError(err.message);
                }
            };
            img.src = encodePreview;
        } catch (err) {
            setEncodeError('Encoding failed. Please try another image.');
        }
    };

    const handleDecode = () => {
        if (!decodeImage) return;
        try {
            const img = new Image();
            img.onload = () => {
                try {
                    const result = decodeMessage(img);
                    setDecodedMessage(result);
                    setDecodeError('');
                } catch (err) {
                    setDecodeError(err.message);
                }
            };
            img.src = decodePreview;
        } catch (err) {
            setDecodeError('Decoding failed.');
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(decodedMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

            <div className="mb-10">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-100 to-brand-400">Operations Control Center</h1>
                <p className="mt-2 text-brand-300">Securely encode or decode payloads using cryptographic LSB steganography. Runs 100% locally on your browser.</p>
            </div>

            <div className="bg-surface/50 backdrop-blur-xl border border-border p-2 rounded-2xl flex max-w-sm mb-8 shadow-lg">
                <button
                    onClick={() => setActiveTab('encode')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'encode' ? 'bg-brand-600 text-white shadow-md' : 'text-brand-300 hover:text-white hover:bg-surface-hover/50'}`}
                >
                    <ImageIcon className="w-4 h-4" /> Encode Payload
                </button>
                <button
                    onClick={() => setActiveTab('decode')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'decode' ? 'bg-brand-600 text-white shadow-md' : 'text-brand-300 hover:text-white hover:bg-surface-hover/50'}`}
                >
                    <FileSpy className="w-4 h-4" /> Decode Payload
                </button>
            </div>

            <div className="glass-panel rounded-2xl p-6 md:p-10 relative min-h-[500px]">
                {activeTab === 'encode' ? (
                    <div className="grid md:grid-cols-2 gap-10">

                        {/* Carrier Selection */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-medium text-white flex items-center gap-2">
                                    <ImageIcon className="w-5 h-5 text-brand-400" /> Carrier Source
                                </h3>
                                <p className="text-sm text-brand-300 mt-1">Select a PNG or JPG image to act as your carrier.</p>
                            </div>

                            <label className="border-2 border-dashed border-brand-700 hover:border-brand-500 bg-surface/30 hover:bg-surface/50 transition-all rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer min-h-[250px] relative overflow-hidden group">
                                <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleEncodeImageLoad} />
                                {encodePreview ? (
                                    <img src={encodePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-30 transition-opacity" />
                                ) : (
                                    <>
                                        <UploadCloud className="w-10 h-10 text-brand-400 mb-3" />
                                        <span className="font-medium text-brand-200">Click or Drag Image Here</span>
                                        <span className="text-xs text-brand-400 mt-2">Maximum 5MB supported locally</span>
                                    </>
                                )}
                                {encodePreview && <span className="relative z-10 font-medium text-white drop-shadow-md">Change Image</span>}
                            </label>
                        </div>

                        {/* Payload Configuration */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-medium text-white flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-brand-400" /> Secret Payload
                                </h3>
                                <p className="text-sm text-brand-300 mt-1">Enter the classified text to be embedded.</p>
                            </div>

                            <textarea
                                className="input-field min-h-[160px] resize-none"
                                placeholder="Enter strictly confidential payload here..."
                                value={secretMessage}
                                onChange={(e) => setSecretMessage(e.target.value)}
                            />

                            {encodeError && <div className="text-red-400 text-sm">{encodeError}</div>}

                            {encodedResult ? (
                                <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-xl">
                                    <p className="text-emerald-400 font-medium mb-3 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Encoding Successful</p>
                                    <a href={encodedResult} download="secured_payload.png" className="btn-primary w-full shadow-emerald-900/20">
                                        <Download className="w-4 h-4" /> Download Protected Image
                                    </a>
                                </div>
                            ) : (
                                <button
                                    onClick={handleEncode}
                                    disabled={!encodeImage || !secretMessage}
                                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Execute LSB Embedding
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-10">

                        {/* Encoded Carrier Selection */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-medium text-white flex items-center gap-2">
                                    <FileSpy className="w-5 h-5 text-brand-400" /> Carrier Intercept
                                </h3>
                                <p className="text-sm text-brand-300 mt-1">Select an image suspected of containing a SteganoPro payload.</p>
                            </div>

                            <label className="border-2 border-dashed border-brand-700 hover:border-brand-500 bg-surface/30 hover:bg-surface/50 transition-all rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer min-h-[250px] relative overflow-hidden group">
                                <input type="file" accept="image/png" className="hidden" onChange={handleDecodeImageLoad} />
                                {decodePreview ? (
                                    <img src={decodePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-30 transition-opacity" />
                                ) : (
                                    <>
                                        <UploadCloud className="w-10 h-10 text-brand-400 mb-3" />
                                        <span className="font-medium text-brand-200">Upload Secured PNG file</span>
                                    </>
                                )}
                                {decodePreview && <span className="relative z-10 font-medium text-white drop-shadow-md">Change Image</span>}
                            </label>
                        </div>

                        {/* Extraction Display */}
                        <div className="space-y-6 flex flex-col">
                            <div>
                                <h3 className="text-xl font-medium text-white flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-brand-400" /> Extracted Payload
                                </h3>
                                <p className="text-sm text-brand-300 mt-1">The decoded contents will appear below.</p>
                            </div>

                            {decodeError && <div className="text-red-400 text-sm mb-2">{decodeError}</div>}

                            <div className="flex-grow bg-slate-900/50 border border-slate-700 rounded-lg p-5 text-white/90 min-h-[160px] relative font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {decodedMessage ? decodedMessage : <span className="text-slate-500 italic">No payload extracted yet. Awaiting initialization.</span>}

                                {decodedMessage && (
                                    <button
                                        onClick={handleCopy}
                                        className="absolute top-3 right-3 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-md transition-all"
                                    >
                                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={handleDecode}
                                disabled={!decodeImage}
                                className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
                            >
                                Initiate Extraction Sequence
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}

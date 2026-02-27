import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ReactLenis } from '@studio-freight/react-lenis';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectCreative, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-creative';
import { 
  Shield, 
  Lock, 
  Unlock, 
  Image as ImageIcon, 
  Download, 
  RefreshCw, 
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Zap,
  LogOut,
  User,
  Mail,
  Key,
  Music,
  Volume2,
  Play,
  Pause,
  Clipboard,
  Save,
  Moon,
  Sun,
  Eye,
  FileUp,
  Activity,
  Maximize2,
  Twitter,
  Github,
  Linkedin,
  Globe,
  ArrowRight
} from 'lucide-react';
import { encodeMessage, decodeMessage, stringToUint8, uint8ToString } from './utils/steganography';
import { encodeAudioMessage, decodeAudioMessage, audioBufferToWav } from './utils/audioSteganography';
import { encryptData, decryptData } from './utils/crypto';

// Helper for Statistical Analysis
const calculateHistogram = (imageData: ImageData) => {
  const r = new Array(256).fill(0);
  const g = new Array(256).fill(0);
  const b = new Array(256).fill(0);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    r[data[i]]++;
    g[data[i+1]]++;
    b[data[i+2]]++;
  }
  return { r, g, b };
};

const calculateChiSquare = (imageData: ImageData) => {
  const data = imageData.data;
  const observed = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    observed[data[i]]++;
  }
  let chiSquare = 0;
  for (let i = 0; i < 256; i += 2) {
    const y_i = (observed[i] + observed[i + 1]) / 2;
    if (y_i > 0) {
      chiSquare += Math.pow(observed[i] - y_i, 2) / y_i;
    }
  }
  // Simplified probability mapping: higher chi-square = higher chance of LSB hiding
  // A typical image has very high chi-square if natural, but lower if bits are randomized
  const prob = Math.max(0, 100 - (chiSquare / (data.length / 400)));
  return Math.min(100, prob);
};

const HistogramView = ({ data, color }: { data: number[], color: string }) => {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-[1px] h-16 w-full bg-slate-50/50 rounded-lg p-1 overflow-hidden">
      {data.map((val, i) => (
        <div
          key={i}
          className="flex-1 min-w-[1px]"
          style={{
            height: `${(val / max) * 100}%`,
            backgroundColor: color,
            opacity: 0.6
          }}
        />
      ))}
    </div>
  );
};

type Mode = 'home' | 'encode' | 'decode' | 'compare' | 'analyze' | 'signin' | 'signup';

interface RecentActivity {
  id: string;
  type: 'encode' | 'decode';
  timestamp: number;
  imageName: string;
}

interface UserData {
  id: string;
  email: string;
  name: string;
}

export default function App() {
  const [mode, setMode] = useState<Mode>('home');
  
  const [isSecure, setIsSecure] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [decodedMessage, setDecodedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageMetadata, setImageMetadata] = useState<{ width: number; height: number; size: string; capacity: number } | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [resultAudio, setResultAudio] = useState<string | null>(null);
  const [audioMetadata, setAudioMetadata] = useState<{ duration: string; size: string; capacity: number } | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [password, setPassword] = useState('');
  const [seed, setSeed] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isDark, setIsDark] = useState(true);
  const [hiddenFile, setHiddenFile] = useState<{ name: string, data: Uint8Array } | null>(null);
  const [useCompression, setUseCompression] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<{ red: string; green: string; blue: string; heatmap: string } | null>(null);
  const [bitPlane, setBitPlane] = useState(0);
  const [analysisChannel, setAnalysisChannel] = useState<'all' | 'red' | 'green' | 'blue' | 'heatmap'>('all');
  const [histograms, setHistograms] = useState<{ original: any, result: any } | null>(null);
  const [chiSquareScore, setChiSquareScore] = useState<number | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  console.log('App Render - mode:', mode, 'user:', user?.name);

  // Load Activity
  useEffect(() => {
    try {
      const savedActivity = localStorage.getItem('stegano_activity');
      if (savedActivity) {
        setRecentActivity(JSON.parse(savedActivity));
      }
    } catch (e) {
      console.error("Failed to parse activity", e);
      localStorage.removeItem('stegano_activity');
    }
  }, []);

  useEffect(() => {
    const len = password.length;
    const lower = /[a-z]/.test(password) ? 1 : 0;
    const upper = /[A-Z]/.test(password) ? 1 : 0;
    const digit = /[0-9]/.test(password) ? 1 : 0;
    const symbol = /[^A-Za-z0-9]/.test(password) ? 1 : 0;
    const variety = lower + upper + digit + symbol;
    const score = Math.min(100, Math.round((len / 24) * 50) + variety * 12);
    setPasswordStrength(score);
  }, [password]);

  const reset = () => {
    setSelectedImage(null);
    setSelectedAudio(null);
    setAudioBuffer(null);
    setResultAudio(null);
    setAudioMetadata(null);
    setMessage('');
    setResultImage(null);
    setDecodedMessage(null);
    setError(null);
    setIsProcessing(false);
  };

  const addActivity = (type: 'encode' | 'decode') => {
    const newActivity: RecentActivity = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      timestamp: Date.now(),
      imageName: selectedAudio ? 'Audio_Carrier' : 'Image_Carrier'
    };
    const updated = [newActivity, ...recentActivity].slice(0, 5);
    setRecentActivity(updated);
    localStorage.setItem('stegano_activity', JSON.stringify(updated));
  };

  const processSelectedFile = (file: File | undefined) => {
    if (file) {
      setError(null);
      reset(); // Clear previous state
      
      if (file.type.startsWith('image/')) {
        setIsImageLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
          const dataUrl = event.target?.result as string;
          const img = new Image();
          img.onload = () => {
            setSelectedImage(dataUrl);
            const capacity = Math.floor((img.width * img.height * 3) / 8);
            setImageMetadata({
              width: img.width,
              height: img.height,
              size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
              capacity
            });
            setIsImageLoading(false);
          };
          img.onerror = () => {
            setError('Failed to load image. Please try another file.');
            setIsImageLoading(false);
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('audio/')) {
        setIsImageLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const buffer = await audioCtx.decodeAudioData(arrayBuffer);
            setAudioBuffer(buffer);
            setSelectedAudio(URL.createObjectURL(file));
            const capacity = Math.floor((buffer.length * buffer.numberOfChannels) / 8);
            setAudioMetadata({
              duration: buffer.duration.toFixed(2) + 's',
              size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
              capacity
            });
            setIsImageLoading(false);
          } catch (err) {
            setError('Failed to decode audio. Please try another file.');
            setIsImageLoading(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        setError('Unsupported file type. Please select an image or audio file.');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processSelectedFile(file);
  };

  const handleAuth = () => {
    if (!authForm.email || !authForm.password) {
      setError('Credentials required for authorization');
      return;
    }
    if (mode === 'signup' && !authForm.name) {
      setError('Operator codename required');
      return;
    }

    setIsProcessing(true);
    setProcessingStep('Authenticating Unit...');
    setProcessingProgress(30);

    setTimeout(() => {
      setProcessingProgress(70);
      setProcessingStep('Securing Gateway...');
      
      setTimeout(() => {
        setUser({ 
          id: Math.random().toString(36).substr(2, 9), 
          email: authForm.email, 
          name: authForm.name || 'Operator' 
        });
        setMode('home');
        setIsProcessing(false);
        setProcessingProgress(0);
        setError(null);
        // Clear form
        setAuthForm({ email: '', password: '', name: '' });
      }, 800);
    }, 1000);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    processSelectedFile(file);
  };

  const handleEncode = async () => {
    if ((!selectedImage && !audioBuffer) || (!message && !hiddenFile)) return;
    setIsProcessing(true);
    setProcessingProgress(0);
    setError(null);

    try {
      setProcessingStep('Security Handshake');
      setProcessingProgress(10);
      await new Promise(r => setTimeout(r, 400));

      let payload: Uint8Array;
      const dataToHide = hiddenFile ? hiddenFile.data : message;

      if (isSecure) {
        setProcessingStep('AES-256 Key Derivation');
        setProcessingProgress(25);
        await new Promise(r => setTimeout(r, 500));
        
        setProcessingStep('Payload Encryption');
        setProcessingProgress(40);
        payload = await encryptData(dataToHide, password || undefined, useCompression);
        await new Promise(r => setTimeout(r, 500));
      } else {
        payload = typeof dataToHide === 'string' ? stringToUint8(dataToHide) : dataToHide;
      }

      if (selectedImage) {
        setProcessingStep('Carrier Image Analysis');
        setProcessingProgress(55);
        const img = new Image();
        img.src = selectedImage;
        await img.decode();
        await new Promise(r => setTimeout(r, 400));

        const canvas = canvasRef.current!;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        setProcessingStep('Chaotic Bit Mapping');
        setProcessingProgress(75);
        await new Promise(r => setTimeout(r, 600));

        const encodedData = seed ? encodeMessage(imageData, payload, seed) : encodeMessage(imageData, payload, isSecure ? undefined : '');
        if (!encodedData) {
          throw new Error('Payload too large for this image');
        }

        ctx.putImageData(encodedData, 0, 0);
        setResultImage(canvas.toDataURL('image/png'));
        
        // Generate Histogram for Comparison
        const resultHist = calculateHistogram(encodedData);
        const originalHist = calculateHistogram(imageData);
        setHistograms({ original: originalHist, result: resultHist });
      } else if (audioBuffer) {
        setProcessingStep('Audio Stream Analysis');
        setProcessingProgress(55);
        await new Promise(r => setTimeout(r, 600));

        setProcessingStep('Chaotic Bit Mapping');
        setProcessingProgress(75);
        await new Promise(r => setTimeout(r, 600));

        const encodedBuffer = seed ? encodeAudioMessage(audioBuffer, payload, seed) : encodeAudioMessage(audioBuffer, payload, isSecure ? undefined : '');
        if (!encodedBuffer) {
          throw new Error('Payload too large for this audio file');
        }

        const wavBlob = audioBufferToWav(encodedBuffer);
        setResultAudio(URL.createObjectURL(wavBlob));
      }

      setProcessingProgress(100);
      setProcessingStep('Encryption Complete');
      addActivity('encode');
      await new Promise(r => setTimeout(r, 500));
      setIsProcessing(false);
    } catch (err: any) {
      setError(err.message || 'Processing failed');
      setIsProcessing(false);
    }
  };

  const handleDecode = async () => {
    if (!selectedImage && !audioBuffer) return;
    setIsProcessing(true);
    setProcessingProgress(0);
    setError(null);

    try {
      let payload: Uint8Array | null = null;

      if (selectedImage) {
        setProcessingStep('Image Analysis');
        setProcessingProgress(20);
        const img = new Image();
        img.src = selectedImage;
        await img.decode();

        const canvas = canvasRef.current!;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        setProcessingStep('Chaotic Bit Extraction');
        setProcessingProgress(50);
        await new Promise(r => setTimeout(r, 600));

        payload = seed ? decodeMessage(imageData, seed) : decodeMessage(imageData, isSecure ? undefined : '');
      } else if (audioBuffer) {
        setProcessingStep('Audio Stream Analysis');
        setProcessingProgress(20);
        await new Promise(r => setTimeout(r, 600));

        setProcessingStep('Chaotic Bit Extraction');
        setProcessingProgress(50);
        await new Promise(r => setTimeout(r, 600));

        payload = seed ? decodeAudioMessage(audioBuffer, seed) : decodeAudioMessage(audioBuffer, isSecure ? undefined : '');
      }

      if (!payload) {
        throw new Error('No hidden message found or invalid security key');
      }

      if (isSecure) {
        setProcessingStep('AES-256 Decryption');
        setProcessingProgress(80);
        await new Promise(r => setTimeout(r, 500));
        const { data, isText } = await decryptData(payload, password || undefined);
        if (isText) {
          setDecodedMessage(uint8ToString(data));
        } else {
          // It's a file
          const blob = new Blob([data], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'hidden_file_decrypted';
          link.click();
          setDecodedMessage('Binary file detected and downloaded successfully.');
        }
      } else {
        setDecodedMessage(uint8ToString(payload));
      }

      setProcessingProgress(100);
      setProcessingStep('Decryption Complete');
      addActivity('decode');
      await new Promise(r => setTimeout(r, 500));
      setIsProcessing(false);
    } catch (err: any) {
      setError('Failed to decode. The file might not contain a message or it was encrypted with a different protocol.');
      setIsProcessing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    setProcessingStep('Analyzing Bit Planes...');
    setProcessingProgress(20);

    const img = new Image();
    img.src = selectedImage;
    await img.decode();

    const canvas = canvasRef.current!;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const generatePlane = (channel: 'all' | 'red' | 'green' | 'blue') => {
      ctx.drawImage(img, 0, 0);
      const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = currentImageData.data;

      for (let i = 0; i < data.length; i += 4) {
        if (channel === 'all') {
          for (let j = 0; j < 3; j++) {
            const bit = (data[i + j] >> bitPlane) & 1;
            data[i + j] = bit ? 255 : 0;
          }
        } else {
          const channelIdx = channel === 'red' ? 0 : channel === 'green' ? 1 : 2;
          const bit = (data[i + channelIdx] >> bitPlane) & 1;
          const val = bit ? 255 : 0;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }
        data[i + 3] = 255;
      }
      ctx.putImageData(currentImageData, 0, 0);
      return canvas.toDataURL();
    };

    const generateHeatmap = () => {
      ctx.drawImage(img, 0, 0);
      const heatmapImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = heatmapImageData.data;
      for (let i = 0; i < data.length; i += 4) {
        // Calculate local contrast as capacity
        const lum = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
        // High frequency regions have more capacity
        data[i] = lum; // Intensity
        data[i+1] = 0;
        data[i+2] = 255 - lum; // Blue for cold, red for hot
        data[i+3] = 200; // Semi-transparent
      }
      ctx.putImageData(heatmapImageData, 0, 0);
      return canvas.toDataURL();
    };

    const results = {
      all: generatePlane('all'),
      red: generatePlane('red'),
      green: generatePlane('green'),
      blue: generatePlane('blue'),
      heatmap: generateHeatmap()
    };

    setAnalysisResult(results.all);
    setAnalysisResults(results);
    
    // Perform Chi-Square Analysis
    const prob = calculateChiSquare(imageData);
    setChiSquareScore(prob);

    setProcessingProgress(100);
    setIsProcessing(false);
  };

  const downloadImage = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = 'stegano_secure.png';
    link.click();
  };

  const downloadAudio = () => {
    if (!resultAudio) return;
    const link = document.createElement('a');
    link.href = resultAudio;
    link.download = 'stegano_secure.wav';
    link.click();
  };

  const copyDecoded = () => {
    if (!decodedMessage) return;
    navigator.clipboard.writeText(decodedMessage);
  };

  const saveDecoded = () => {
    if (!decodedMessage) return;
    const blob = new Blob([decodedMessage], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'decoded_message.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`min-h-screen font-sans transition-all duration-700 ${isDark ? 'bg-[#081A16] text-white' : 'bg-[#F0F9F6] text-slate-900'} selection:bg-[#21F4BD]/30`}>
      <canvas ref={canvasRef} className="hidden" />
        
        {/* Full-Page Auth Modal */}
        {(mode === 'signin' || mode === 'signup') && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-0"
            >
              <div className="absolute inset-0 bg-[#081A16]/95 backdrop-blur-2xl" />
              
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className={`relative w-full max-w-6xl h-full max-h-[800px] flex overflow-hidden rounded-[3rem] shadow-2xl shadow-black/50 border transition-colors duration-700 ${isDark ? 'bg-[#0D2621] border-white/5' : 'bg-white border-teal-100'}`}
              >
                {/* Branding Side */}
                <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-[#126650] to-[#081A16] p-16 flex-col justify-between overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-[#21F4BD]/10 blur-[100px] rounded-full -mr-48 -mt-48" />
                  <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#126650]/20 blur-[100px] rounded-full -ml-48 -mb-48" />
                  
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white">
                      <Shield size={28} />
                    </div>
                    <div>
                      <h1 className="text-2xl font-black tracking-tighter text-white">STEGANO<span className="text-[#21F4BD]">PRO</span></h1>
                      <p className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">Elite Forest Defense</p>
                    </div>
                  </div>

                  <div className="relative z-10 space-y-6">
                    <h2 className="text-5xl font-black tracking-tighter text-white leading-none">
                      {mode === 'signin' ? 'WELCOME BACK, OPERATOR.' : 'ENLIST IN THE UNIT.'}
                    </h2>
                    <p className="text-white/60 text-lg font-medium max-w-md">
                      {mode === 'signin' 
                        ? 'Access your secure dashboard and continue your mission in data protection.' 
                        : 'Create your secure identity and start protecting sensitive intelligence with elite tools.'}
                    </p>
                  </div>

                  <div className="relative z-10 flex items-center gap-4 text-white/40 text-xs font-black uppercase tracking-widest">
                    <div className="flex -space-x-3">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-[#126650] bg-slate-800 overflow-hidden">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="Avatar" />
                        </div>
                      ))}
                    </div>
                    <span>Join 2,400+ Elite Operators</span>
                  </div>
                </div>

                {/* Form Side */}
                <div className="w-full lg:w-1/2 p-8 lg:p-20 flex flex-col justify-center relative">
                  <button 
                    onClick={() => setMode('home')}
                    className={`absolute top-8 right-8 p-3 rounded-2xl transition-all ${isDark ? 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10' : 'bg-teal-50 text-[#126650] hover:bg-teal-100'}`}
                  >
                    <ArrowLeft size={20} />
                  </button>

                  <div className="max-w-md mx-auto w-full space-y-10">
                    <div className="space-y-2">
                      <h3 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#126650]'}`}>
                        {mode === 'signin' ? 'Authorization Required' : 'Create Operator Profile'}
                      </h3>
                      <p className={`font-medium ${isDark ? 'text-white/40' : 'text-[#3CBFA0]'}`}>
                        {mode === 'signin' ? 'Enter your credentials to bypass the firewall.' : 'Initialize your secure access protocols.'}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {mode === 'signup' && (
                        <div className="space-y-2">
                          <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-[#126650]'}`}>Codename</label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-[#21F4BD] transition-colors">
                              <User size={18} />
                            </div>
                            <input 
                              type="text"
                              value={authForm.name}
                              onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                              placeholder="e.g. Ghost_Protocol"
                              className={`w-full pl-12 pr-4 py-4 rounded-2xl border outline-none transition-all font-bold ${isDark ? 'bg-white/5 border-white/5 focus:border-[#21F4BD]/50 text-white placeholder:text-white/10' : 'bg-teal-50 border-teal-100 focus:border-[#126650] text-[#126650] placeholder:text-[#3CBFA0]/50'}`}
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-[#126650]'}`}>Secure Email</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-[#21F4BD] transition-colors">
                            <Mail size={18} />
                          </div>
                          <input 
                            type="email"
                            value={authForm.email}
                            onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                            placeholder="operator@stegano.pro"
                            className={`w-full pl-12 pr-4 py-4 rounded-2xl border outline-none transition-all font-bold ${isDark ? 'bg-white/5 border-white/5 focus:border-[#21F4BD]/50 text-white placeholder:text-white/10' : 'bg-teal-50 border-teal-100 focus:border-[#126650] text-[#126650] placeholder:text-[#3CBFA0]/50'}`}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-[#126650]'}`}>Access Key</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-[#21F4BD] transition-colors">
                            <Key size={18} />
                          </div>
                          <input 
                            type="password"
                            value={authForm.password}
                            onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                            placeholder="••••••••••••"
                            className={`w-full pl-12 pr-4 py-4 rounded-2xl border outline-none transition-all font-bold ${isDark ? 'bg-white/5 border-white/5 focus:border-[#21F4BD]/50 text-white placeholder:text-white/10' : 'bg-teal-50 border-teal-100 focus:border-[#126650] text-[#126650] placeholder:text-[#3CBFA0]/50'}`}
                          />
                        </div>
                      </div>
                    </div>

                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400"
                      >
                        <AlertCircle size={18} />
                        <p className="text-xs font-black uppercase tracking-widest">{error}</p>
                      </motion.div>
                    )}

                    <div className="space-y-6">
                      <button 
                        onClick={handleAuth}
                        disabled={isProcessing}
                        className="w-full py-5 rounded-2xl bg-gradient-to-r from-[#126650] to-[#3CBFA0] text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-[#126650]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <><RefreshCw size={18} className="animate-spin" /> Processing...</>
                        ) : (
                          <>{mode === 'signin' ? 'Authorize Access' : 'Initialize Profile'} <ArrowRight size={18} /></>
                        )}
                      </button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className={`w-full border-t ${isDark ? 'border-white/10' : 'border-teal-100'}`}></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                          <span className={`px-4 ${isDark ? 'bg-[#0D2621] text-white/20' : 'bg-white text-[#3CBFA0]'}`}>Or Continue With</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => {/* Google Auth Logic */}}
                        className={`w-full py-4 rounded-2xl border font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-teal-100 text-[#126650] hover:bg-teal-50'}`}
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Google
                      </button>

                      <div className="text-center">
                        <button 
                          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                          className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-white/40 hover:text-[#21F4BD]' : 'text-[#3CBFA0] hover:text-[#126650]'} transition-colors`}
                        >
                          {mode === 'signin' ? "Don't have access? Join the Unit" : "Already an Operator? Authorize"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
            )}

        {/* Dynamic Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] ${isDark ? 'bg-[#126650]/20' : 'bg-[#126650]/5'} blur-[120px] rounded-full transition-colors duration-700`} />
          <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] ${isDark ? 'bg-[#21F4BD]/10' : 'bg-[#21F4BD]/5'} blur-[120px] rounded-full transition-colors duration-700`} />
          <div className={`absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] ${isDark ? 'opacity-20' : 'opacity-[0.03]'} mix-blend-overlay transition-opacity duration-700`} />
        </div>

        {/* Modern Header */}
        <header className={`sticky top-0 z-[60] backdrop-blur-xl border-b ${isDark ? 'bg-[#081A16]/80 border-white/5' : 'bg-white/80 border-teal-100'} px-6 py-4 flex items-center justify-between transition-colors duration-700`}>
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => { setMode('home'); reset(); }}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#126650] to-[#21F4BD] flex items-center justify-center text-white shadow-lg shadow-[#126650]/20 group-hover:scale-110 transition-transform duration-300">
              <Shield size={22} className="group-hover:rotate-12 transition-transform" />
            </div>
            <div>
              <h1 className={`text-xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-[#126650]'}`}>STEGANO<span className="text-[#21F4BD]">PRO</span></h1>
              <p className={`text-[9px] font-black tracking-[0.3em] ${isDark ? 'text-white/40' : 'text-[#3CBFA0]'} uppercase`}>Elite Forest Defense</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8">
            {['Encode', 'Decode', 'Analyze'].map((item) => (
              <button 
                key={item}
                onClick={() => setMode(item.toLowerCase() as any)}
                className={`text-xs font-black uppercase tracking-widest transition-all ${mode === item.toLowerCase() ? 'text-[#21F4BD]' : isDark ? 'text-white/50 hover:text-white' : 'text-[#3CBFA0] hover:text-[#126650]'}`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDark(v => !v)}
              className={`p-2 rounded-xl transition-all flex items-center justify-center ${isDark ? 'bg-white/5 text-[#21F4BD] hover:bg-white/10' : 'bg-teal-50 text-[#126650] hover:bg-teal-100'}`}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            {user ? (
              <div className={`flex items-center gap-3 pl-4 border-l ${isDark ? 'border-white/10' : 'border-teal-100'}`}>
                <div className="text-right hidden md:block">
                  <p className={`text-xs font-black tracking-tight ${isDark ? 'text-white' : 'text-[#126650]'}`}>{user.name}</p>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#21F4BD] animate-pulse" />
                    <p className={`text-[9px] font-bold ${isDark ? 'text-white/40' : 'text-[#3CBFA0]'} uppercase tracking-widest`}>Operator Level 1</p>
                  </div>
                </div>
                <button 
                  onClick={() => setUser(null)}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${isDark ? 'bg-white/5 border border-white/10 text-white/60 hover:bg-[#21F4BD] hover:text-[#081A16]' : 'bg-teal-50 border border-teal-100 text-[#126650] hover:bg-[#126650] hover:text-white'}`}
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setMode('signin')}
                  className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${isDark ? 'text-white/60 hover:text-white' : 'text-[#3CBFA0] hover:text-[#126650]'}`}
                >
                  Login
                </button>
                <button 
                  onClick={() => setMode('signup')}
                  className="px-6 py-2.5 text-xs font-black uppercase tracking-widest bg-gradient-to-r from-[#126650] to-[#3CBFA0] text-white rounded-2xl shadow-lg shadow-[#126650]/20 hover:scale-105 transition-all"
                >
                  Join Unit
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 min-h-[calc(100vh-200px)]">
          {mode === 'home' && (
            <div
              className="space-y-16"
            >
                {/* Hero Section Slider */}
                <div className="relative overflow-hidden rounded-[3rem] transition-colors duration-700">
                  <Swiper
                    modules={[Autoplay, EffectCreative, Pagination]}
                    effect="creative"
                    creativeEffect={{
                      prev: { shadow: true, translate: [0, 0, -400], },
                      next: { translate: ['100%', 0, 0], },
                    }}
                    pagination={{ clickable: true }}
                    autoplay={{ delay: 5000 }}
                    className="h-[500px] lg:h-[600px]"
                  >
                    {[
                      {
                        title: "Secure Your Intellectual Data",
                        desc: "Advanced cryptographic steganography for elite data hiding. Inject encrypted payloads with zero visual footprint.",
                        icon: ShieldCheck,
                        cta: "Start Mission",
                        target: "encode"
                      },
                      {
                        title: "Extract Hidden Intelligence",
                        desc: "Recover encrypted messages from secure carriers using advanced decryption protocols and chaotic mapping.",
                        icon: Unlock,
                        cta: "Recover Intel",
                        target: "decode"
                      },
                      {
                        title: "Deep Neural Forensic Analysis",
                        desc: "Detect hidden data patterns with bit-plane visualization and statistical Chi-Square steganography detection.",
                        icon: Activity,
                        cta: "Scan Carrier",
                        target: "analyze"
                      }
                    ].map((slide, i) => (
                      <SwiperSlide key={i}>
                        <div className={`w-full h-full p-12 lg:p-20 flex flex-col items-center justify-center text-center space-y-8 transition-colors duration-700 ${isDark ? 'bg-gradient-to-br from-[#0D2621] to-[#081A16] border border-white/5' : 'bg-white border border-teal-100 shadow-xl'}`}>
                          <div className={`absolute top-0 right-0 w-96 h-96 ${isDark ? 'bg-[#126650]/10' : 'bg-[#126650]/5'} blur-[100px] rounded-full -mr-48 -mt-48`} />
                          <div className={`absolute bottom-0 left-0 w-96 h-96 ${isDark ? 'bg-[#21F4BD]/10' : 'bg-[#21F4BD]/5'} blur-[100px] rounded-full -ml-48 -mb-48`} />
                          
                          <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#21F4BD]/10 border border-[#21F4BD]/20 text-[#21F4BD] text-[10px] font-black uppercase tracking-widest mb-4"
                          >
                            <slide.icon size={12} className="animate-pulse" />
                            Operational System v2.5.0
                          </motion.div>
                          
                          <h2 className={`text-4xl lg:text-7xl font-black tracking-tighter leading-tight max-w-4xl mx-auto uppercase ${isDark ? 'text-white' : 'text-[#126650]'}`}>
                            {slide.title.split(' ').map((word, index) => (
                              index === 2 ? <span key={index} className="text-transparent bg-clip-text bg-gradient-to-r from-[#126650] via-[#3CBFA0] to-[#21F4BD]">{word} </span> : word + ' '
                            ))}
                          </h2>
                          
                          <p className={`text-lg max-w-2xl mx-auto font-medium leading-relaxed ${isDark ? 'text-white/50' : 'text-slate-600'}`}>
                            {slide.desc}
                          </p>

                          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <button 
                              onClick={() => setMode(slide.target as any)}
                              className="w-full sm:w-auto px-10 py-5 rounded-[2rem] bg-gradient-to-r from-[#126650] to-[#3CBFA0] text-white font-black text-lg shadow-2xl shadow-[#126650]/30 hover:scale-105 transition-all flex items-center justify-center gap-3 group"
                            >
                              {slide.cta} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                          </div>
                        </div>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </div>

              {/* Feature Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { title: 'Secure Encode', desc: 'Hide encrypted data in carriers', icon: Lock, color: 'from-[#126650] to-[#3CBFA0]', mode: 'encode' },
                  { title: 'Secure Decode', desc: 'Extract hidden intelligence', icon: Unlock, color: 'from-[#3CBFA0] to-[#21F4BD]', mode: 'decode' },
                  { title: 'Neural Scan', desc: 'Bit-plane forensic analysis', icon: Activity, color: 'from-[#126650] to-[#21F4BD]', mode: 'analyze' }
                ].map((feat, i) => (
                  <motion.button
                    key={feat.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + (i * 0.1) }}
                    onClick={() => setMode(feat.mode as any)}
                    className={`group relative p-8 rounded-[2.5rem] border transition-all text-left overflow-hidden ${isDark ? 'bg-[#0D2621] border-white/5 hover:border-white/20' : 'bg-white border-teal-100 hover:border-[#21F4BD]/50 shadow-lg shadow-teal-900/5'}`}
                  >
                    <div className={`absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-500 ${isDark ? 'text-white' : 'text-[#126650]'}`}>
                      <feat.icon size={120} />
                    </div>
                    <div className="relative z-10 space-y-6">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${feat.color} flex items-center justify-center text-white shadow-xl group-hover:rotate-12 transition-transform duration-300`}>
                        <feat.icon size={28} />
                      </div>
                      <div>
                        <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-[#126650]'}`}>{feat.title}</h3>
                        <p className={`mt-1 font-medium ${isDark ? 'text-white/40' : 'text-[#3CBFA0]'}`}>{feat.desc}</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Stats & Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center justify-between px-4">
                    <h3 className={`text-xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-[#126650]'}`}>Mission History</h3>
                    <button 
                      onClick={() => {
                        setRecentActivity([]);
                        localStorage.removeItem('stegano_activity');
                      }}
                      className="text-[10px] font-black text-[#21F4BD] uppercase tracking-widest hover:underline"
                    >
                      Purge Logs
                    </button>
                  </div>
                  <div className="space-y-4">
                    {recentActivity.length > 0 ? recentActivity.slice(0, 4).map((activity) => (
                      <motion.div 
                        key={activity.id}
                        layout
                        className={`glass p-5 rounded-[2rem] flex items-center justify-between group transition-all ${!isDark && 'bg-white border-teal-100 shadow-lg shadow-teal-900/5'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${activity.type === 'encode' ? 'bg-[#126650]/10 text-[#126650]' : 'bg-[#21F4BD]/10 text-[#21F4BD]'}`}>
                            {activity.imageName.includes('Audio') ? <Music size={20} /> : (activity.type === 'encode' ? <Lock size={20} /> : <Unlock size={20} />)}
                          </div>
                          <div>
                            <p className={`font-black text-sm uppercase tracking-tight ${isDark ? 'text-white' : 'text-[#126650]'}`}>{activity.imageName}</p>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-white/30' : 'text-[#3CBFA0]'}`}>
                              {new Date(activity.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          </div>
                        </div>
                        <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDark ? 'bg-white/5 text-white/40 group-hover:text-white group-hover:bg-[#126650]' : 'bg-teal-50 text-[#3CBFA0] group-hover:bg-[#126650] group-hover:text-white'}`}>
                          {activity.type === 'encode' ? 'Encrypted' : 'Extracted'}
                        </div>
                      </motion.div>
                    )) : (
                      <div className={`glass p-12 rounded-[2.5rem] flex flex-col items-center gap-4 text-center ${!isDark && 'bg-white border-teal-100'}`}>
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                          <RefreshCw size={32} />
                        </div>
                        <p className={`font-bold uppercase tracking-widest text-xs ${isDark ? 'text-white/30' : 'text-[#3CBFA0]'}`}>No active intelligence recorded</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className={`text-xl font-black uppercase tracking-tighter px-4 ${isDark ? 'text-white' : 'text-[#126650]'}`}>System Status</h3>
                  <div className={`glass p-8 rounded-[2.5rem] space-y-8 ${!isDark && 'bg-white border-teal-100 shadow-lg shadow-teal-900/5'}`}>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-[#3CBFA0]'}`}>Neural Load</span>
                        <span className="text-[10px] font-black text-[#21F4BD]">OPTIMIZED</span>
                      </div>
                      <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-teal-50'}`}>
                        <motion.div initial={{ width: 0 }} animate={{ width: '65%' }} className="h-full bg-[#126650]" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-[#3CBFA0]'}`}>Core Status</span>
                        <span className="text-[10px] font-black text-[#21F4BD]">ENCRYPTED</span>
                      </div>
                      <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-teal-50'}`}>
                        <motion.div initial={{ width: 0 }} animate={{ width: '82%' }} className="h-full bg-[#126650]" />
                      </div>
                    </div>
                    <div className={`pt-4 border-t space-y-4 ${isDark ? 'border-white/5' : 'border-teal-50'}`}>
                      <div className="flex items-center gap-3">
                        <ShieldCheck size={16} className="text-[#21F4BD]" />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-[#126650]'}`}>End-to-End Encryption Active</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Zap size={16} className="text-[#21F4BD]" />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-[#126650]'}`}>Chaotic Bit Mapping Enabled</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(mode === 'encode' || mode === 'decode' || mode === 'analyze') && (
            <motion.div
              key="action"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <motion.button 
                  whileHover={{ x: -5 }}
                  onClick={() => { setMode('home'); reset(); setAnalysisResult(null); }}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-950 transition-colors font-bold uppercase text-xs tracking-widest"
                >
                  <ArrowLeft size={18} />
                  Back
                </motion.button>

                {mode !== 'analyze' && (
                  <div className={`flex items-center gap-4 p-1 rounded-2xl transition-colors duration-700 ${isDark ? 'bg-white/5' : 'bg-teal-50'}`}>
                    <button 
                      onClick={() => setIsSecure(true)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${isSecure ? 'bg-[#126650] text-white shadow-lg shadow-[#126650]/20' : isDark ? 'text-white/40 hover:text-white' : 'text-[#3CBFA0] hover:text-[#126650]'}`}
                    >
                      <Shield size={14} /> Secure
                    </button>
                    <button 
                      onClick={() => setIsSecure(false)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${!isSecure ? 'bg-[#126650] text-white shadow-lg shadow-[#126650]/20' : isDark ? 'text-white/40 hover:text-white' : 'text-[#3CBFA0] hover:text-[#126650]'}`}
                    >
                      <Zap size={14} /> Basic
                    </button>
                  </div>
                )}
              </div>

              <div className={`rounded-[3rem] border p-10 shadow-sm space-y-10 transition-colors duration-700 ${isDark ? 'bg-[#0D2621] border-white/5' : 'bg-white border-teal-100 shadow-xl shadow-teal-900/5'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${mode === 'encode' ? 'bg-[#126650] shadow-lg shadow-[#126650]/20' : mode === 'decode' ? 'bg-[#3CBFA0] shadow-lg shadow-[#3CBFA0]/20' : 'bg-[#21F4BD] shadow-lg shadow-[#21F4BD]/20'}`}>
                    {mode === 'encode' ? <Lock size={24} /> : mode === 'decode' ? <Unlock size={24} /> : <Activity size={24} />}
                  </div>
                  <h2 className={`text-3xl font-black ${isDark ? 'text-white' : 'text-[#126650]'}`}>{mode === 'encode' ? 'Encode' : mode === 'decode' ? 'Decode' : 'Analyze'} Data</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">1. Carrier File</label>
                      <motion.div 
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className={`relative aspect-video rounded-[2rem] border-4 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden
                          ${(selectedImage || selectedAudio) ? 'border-indigo-100 bg-indigo-50/20' : 'border-slate-100 hover:border-indigo-200 bg-slate-50'}`}
                      >
                        <AnimatePresence mode="wait">
                          {isImageLoading ? (
                            <motion.div 
                              key="loading"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex flex-col items-center gap-3"
                            >
                              <RefreshCw className="text-indigo-600 animate-spin" size={32} />
                              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Optimizing File...</span>
                            </motion.div>
                          ) : selectedImage ? (
                            <motion.div key="preview" className="relative w-full h-full">
                              <motion.img 
                                initial={{ opacity: 0, scale: 1.05 }}
                                animate={{ opacity: 1, scale: 1 }}
                                src={selectedImage} 
                                className="w-full h-full object-contain bg-slate-900/5" 
                                alt="Selected" 
                              />
                              {imageMetadata && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="absolute bottom-4 left-4 right-4 flex gap-2"
                                >
                                  <div className="px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200/50 flex items-center gap-2">
                                    <ImageIcon size={12} className="text-indigo-600" />
                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">
                                      {imageMetadata.width} × {imageMetadata.height}
                                    </span>
                                  </div>
                                  <div className="px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200/50 flex items-center gap-2">
                                    <FileText size={12} className="text-indigo-600" />
                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">
                                      {imageMetadata.size}
                                    </span>
                                  </div>
                                  <div className="ml-auto px-3 py-1.5 rounded-lg bg-emerald-500 text-white shadow-sm flex items-center gap-2">
                                    <CheckCircle2 size={12} />
                                    <span className="text-[10px] font-black uppercase tracking-tighter">Ready</span>
                                  </div>
                                </motion.div>
                              )}
                            </motion.div>
                          ) : selectedAudio ? (
                            <motion.div key="audio-preview" className="flex flex-col items-center gap-4 p-8 w-full">
                              <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                                <Music size={40} />
                              </div>
                              <div className="text-center space-y-1">
                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Audio Carrier Loaded</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ready for Bitstream Injection</p>
                              </div>
                              <audio controls src={selectedAudio} className="w-full max-w-[240px] h-8" onClick={(e) => e.stopPropagation()} />
                              {audioMetadata && (
                                <div className="flex gap-2">
                                  <div className="px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200/50 flex items-center gap-2">
                                    <Volume2 size={12} className="text-indigo-600" />
                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">
                                      {audioMetadata.duration}
                                    </span>
                                  </div>
                                  <div className="px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200/50 flex items-center gap-2">
                                    <FileText size={12} className="text-indigo-600" />
                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">
                                      {audioMetadata.size}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ) : (
                            <motion.div 
                              key="placeholder"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex flex-col items-center"
                            >
                              <div className="flex gap-4 mb-3">
                                <ImageIcon size={40} className="text-slate-200" />
                                <Music size={40} className="text-slate-200" />
                              </div>
                              <span className="text-sm text-slate-500 font-bold">Drop Image or Audio Here</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,audio/*" className="hidden" />
                      </motion.div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {mode === 'encode' ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">2. Secret Data</label>
                          {(imageMetadata || audioMetadata) && (
                            <span className={`text-[10px] font-black uppercase tracking-tighter ${message.length > (imageMetadata?.capacity || audioMetadata?.capacity || 0) ? 'text-[#126650]' : isDark ? 'text-white/40' : 'text-slate-400'}`}>
                              {message.length.toLocaleString()} / {(imageMetadata?.capacity || audioMetadata?.capacity || 0).toLocaleString()} chars
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 mb-2">
                          <button 
                            onClick={() => setHiddenFile(null)}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!hiddenFile ? 'bg-[#126650] text-white' : isDark ? 'bg-white/5 text-white/40' : 'bg-slate-100 text-slate-500'}`}
                          >
                            Text Message
                          </button>
                          <button 
                            onClick={() => hiddenFileInputRef.current?.click()}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${hiddenFile ? 'bg-[#126650] text-white' : isDark ? 'bg-white/5 text-white/40' : 'bg-slate-100 text-slate-500'}`}
                          >
                            {hiddenFile ? `File: ${hiddenFile.name}` : 'Hide File'}
                          </button>
                          <input 
                            type="file" 
                            ref={hiddenFileInputRef} 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  setHiddenFile({ name: file.name, data: new Uint8Array(ev.target?.result as ArrayBuffer) });
                                };
                                reader.readAsArrayBuffer(file);
                              }
                            }}
                          />
                        </div>
                        {!hiddenFile ? (
                          <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your secret message..."
                            className="w-full h-[120px] p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all resize-none font-medium"
                          />
                        ) : (
                          <div className="w-full h-[120px] rounded-2xl bg-slate-50 border-2 border-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-2">
                            <FileUp className="text-indigo-600" size={32} />
                            <p className="text-sm font-black text-slate-900">{hiddenFile.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{(hiddenFile.data.length / 1024).toFixed(2)} KB Ready to hide</p>
                          </div>
                        )}
                        {(imageMetadata || audioMetadata) && (
                          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              animate={{ 
                                width: `${Math.min(100, ((hiddenFile ? hiddenFile.data.length : message.length) / (imageMetadata?.capacity || audioMetadata?.capacity || 1)) * 100)}%`,
                                backgroundColor: (hiddenFile ? hiddenFile.data.length : message.length) > (imageMetadata?.capacity || audioMetadata?.capacity || 0) ? '#126650' : '#21F4BD'
                              }}
                              className="h-full transition-colors"
                            />
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-[#3CBFA0]'}`}>Password</label>
                              <button 
                                onClick={() => setUseCompression(!useCompression)}
                                className={`text-[10px] font-black uppercase tracking-widest ${useCompression ? 'text-[#21F4BD]' : isDark ? 'text-white/40' : 'text-slate-400'}`}
                              >
                                {useCompression ? 'Gzip ON' : 'Gzip OFF'}
                              </button>
                            </div>
                            <input
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Optional; AES-256"
                              className={`w-full p-3 rounded-xl border outline-none transition-all ${isDark ? 'bg-white/5 border-white/10 focus:border-[#21F4BD]/50' : 'bg-teal-50/50 border-teal-100 focus:border-[#126650]/50'}`}
                            />
                            <div className={`h-1 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-teal-50'}`}>
                              <motion.div 
                                animate={{ width: `${passwordStrength}%`, backgroundColor: passwordStrength > 70 ? '#21F4BD' : passwordStrength > 40 ? '#3CBFA0' : '#126650' }}
                                className="h-full transition-colors"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-[#3CBFA0]'}`}>Chaotic Seed</label>
                            <input
                              type="text"
                              value={seed}
                              onChange={(e) => setSeed(e.target.value)}
                              placeholder="Optional; shuffle seed"
                              className={`w-full p-3 rounded-xl border outline-none transition-all ${isDark ? 'bg-white/5 border-white/10 focus:border-[#21F4BD]/50' : 'bg-teal-50/50 border-teal-100 focus:border-[#126650]/50'}`}
                            />
                          </div>
                        </div>
                      </div>
                    ) : mode === 'decode' ? (
                      decodedMessage && (
                        <div className="space-y-3">
                          <label className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-[#3CBFA0]'}`}>Decoded Output</label>
                          <div className={`w-full p-6 rounded-2xl font-mono text-lg break-all shadow-inner min-h-[160px] ${isDark ? 'bg-slate-900 text-[#21F4BD]' : 'bg-teal-50 text-[#126650]'}`}>
                            {decodedMessage}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <motion.button 
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={copyDecoded}
                              className={`py-3 rounded-2xl font-black transition-all flex items-center justify-center gap-2 ${isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            >
                              <Clipboard size={18} /> Copy
                            </motion.button>
                            <motion.button 
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={saveDecoded}
                              className="py-3 rounded-2xl bg-[#126650] text-white font-black hover:bg-[#0D2621] transition-all flex items-center justify-center gap-2"
                            >
                              <Save size={18} /> Save
                            </motion.button>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <label className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-[#3CBFA0]'}`}>Analysis Controls</label>
                          <div className={`p-5 rounded-2xl border space-y-4 ${isDark ? 'bg-white/5 border-white/10' : 'bg-teal-50/50 border-teal-100'}`}>
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Statistical Analysis</span>
                              <div className="flex items-center gap-1">
                                <Activity size={12} className="text-[#21F4BD]" />
                                <span className="text-[10px] font-black uppercase text-[#21F4BD]">Real-time</span>
                              </div>
                            </div>
                            {chiSquareScore !== null && (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className={`text-[10px] font-bold uppercase tracking-tighter ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Detection Probability</span>
                                  <span className={`text-sm font-black ${chiSquareScore > 70 ? 'text-[#126650]' : chiSquareScore > 30 ? 'text-[#3CBFA0]' : 'text-[#21F4BD]'}`}>
                                    {chiSquareScore.toFixed(1)}%
                                  </span>
                                </div>
                                <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-teal-50'}`}>
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${chiSquareScore}%` }}
                                    className={`h-full ${chiSquareScore > 70 ? 'bg-[#126650]' : chiSquareScore > 30 ? 'bg-[#3CBFA0]' : 'bg-[#21F4BD]'}`}
                                  />
                                </div>
                                <p className="text-[9px] font-medium text-slate-400 italic">
                                  * Based on Chi-Square statistical noise variance in the primary bit planes.
                                </p>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Select Bit Plane</span>
                              <span className="text-xs font-black text-[#21F4BD]">Plane {bitPlane}</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="7" 
                              value={bitPlane} 
                              onChange={(e) => setBitPlane(parseInt(e.target.value))}
                              className="w-full accent-[#21F4BD]"
                            />
                            <div className={`flex justify-between text-[10px] font-black uppercase ${isDark ? 'text-white/20' : 'text-slate-400'}`}>
                              <span>LSB (0)</span>
                              <span>MSB (7)</span>
                            </div>
                          </div>
                          <p className={`text-[10px] font-bold leading-relaxed ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                            LSB bit-plane visualization helps detect steganography. Hidden data often appears as statistical noise or patterns in the lowest bit planes.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <div className={`flex items-center gap-3 p-5 rounded-2xl border font-bold text-sm ${isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    <AlertCircle size={20} />
                    {error}
                  </div>
                )}

                {/* Processing Overlay */}
                <AnimatePresence>
                  {isProcessing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-md transition-colors duration-700 ${isDark ? 'bg-[#081A16]/95' : 'bg-white/95'}`}
                    >
                      <div className="max-w-md w-full px-8 space-y-8 text-center relative">
                        {/* HUD Elements */}
                        <div className={`absolute -top-20 -left-20 w-40 h-40 border-t-2 border-l-2 rounded-tl-3xl pointer-events-none ${isDark ? 'border-[#21F4BD]/30' : 'border-[#126650]/20'}`} />
                        <div className={`absolute -top-20 -right-20 w-40 h-40 border-t-2 border-r-2 rounded-tr-3xl pointer-events-none ${isDark ? 'border-[#21F4BD]/30' : 'border-[#126650]/20'}`} />
                        <div className={`absolute -bottom-20 -left-20 w-40 h-40 border-b-2 border-l-2 rounded-bl-3xl pointer-events-none ${isDark ? 'border-[#21F4BD]/30' : 'border-[#126650]/20'}`} />
                        <div className={`absolute -bottom-20 -right-20 w-40 h-40 border-b-2 border-r-2 rounded-br-3xl pointer-events-none ${isDark ? 'border-[#21F4BD]/30' : 'border-[#126650]/20'}`} />
                        
                        <div className="relative mx-auto w-32 h-32">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className={`absolute inset-0 border-2 border-dashed rounded-full ${isDark ? 'border-[#21F4BD]/30' : 'border-[#126650]/20'}`}
                          />
                          <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            className={`absolute inset-2 border rounded-full ${isDark ? 'border-[#3CBFA0]/20' : 'border-[#126650]/10'}`}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                              animate={{ 
                                scale: [1, 1.1, 1],
                                opacity: [0.5, 1, 0.5]
                              }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <Shield className="text-[#21F4BD]" size={40} />
                            </motion.div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-1">
                            <motion.h3 
                              key={processingStep}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={`text-2xl font-black tracking-tighter uppercase ${isDark ? 'text-white' : 'text-[#126650]'}`}
                            >
                              {processingStep}
                            </motion.h3>
                            <div className="flex items-center justify-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#21F4BD] animate-pulse" />
                              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-[#3CBFA0]'}`}>
                                {mode === 'encode' ? 'System.Security.Protocol_Active' : mode === 'decode' ? 'System.Decryption.Sequence' : 'System.Heuristic.Analysis'}
                              </p>
                            </div>
                          </div>

                          <div className={`relative h-12 w-full rounded-xl border overflow-hidden group ${isDark ? 'bg-white/5 border-white/10' : 'bg-teal-50 border-teal-100'}`}>
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${processingProgress}%` }}
                              className="h-full bg-[#126650] shadow-[0_0_20px_rgba(18,102,80,0.4)] relative"
                            >
                              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
                            </motion.div>
                            <div className="absolute inset-0 flex items-center justify-center mix-blend-difference">
                              <span className="text-xs font-black text-white tabular-nums">{processingProgress}% COMPLETE</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-teal-50'}`}>
                                <motion.div 
                                  animate={{ 
                                    opacity: processingProgress > (i * 33) ? 1 : 0.2,
                                    x: processingProgress > (i * 33) ? 0 : -100
                                  }}
                                  className="h-full bg-[#21F4BD]"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-4 flex flex-col items-center gap-1">
                          <p className={`text-[8px] font-mono uppercase ${isDark ? 'text-white/20' : 'text-[#3CBFA0]'}`}>Memory_Addr: 0x{Math.random().toString(16).substr(2, 8).toUpperCase()}</p>
                          <p className={`text-[8px] font-mono uppercase ${isDark ? 'text-white/20' : 'text-[#3CBFA0]'}`}>Buffer_Status: Optimized</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {mode === 'encode' ? (
                  (!resultImage && !resultAudio) ? (
                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={(!selectedImage && !audioBuffer) || (!message && !hiddenFile) || isProcessing}
                      onClick={handleEncode}
                      className="w-full py-6 rounded-2xl bg-gradient-to-r from-[#126650] to-[#3CBFA0] text-white font-black text-xl shadow-2xl shadow-[#126650]/20 hover:scale-[1.01] disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                    >
                      {isProcessing ? <RefreshCw className="animate-spin" /> : <Lock size={24} />}
                      {isProcessing ? 'Processing...' : 'Secure Encode'}
                    </motion.button>
                  ) : (
                    <div className="space-y-6">
                      {resultAudio && (
                        <div className={`p-6 rounded-3xl border flex flex-col items-center gap-4 transition-colors ${isDark ? 'bg-teal-900/10 border-teal-500/20' : 'bg-teal-50 border-teal-100'}`}>
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-[#3CBFA0] flex items-center justify-center text-white">
                               <Volume2 size={20} />
                             </div>
                             <span className={`font-black uppercase tracking-tight ${isDark ? 'text-[#21F4BD]' : 'text-[#126650]'}`}>Encoded Audio Ready</span>
                           </div>
                           <audio controls src={resultAudio} className="w-full" />
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-4">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => { reset(); }} 
                          className={`py-6 rounded-2xl font-black transition-all ${isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                          Reset
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowCompare(true)} 
                          disabled={!resultImage}
                          className={`py-6 rounded-2xl font-black disabled:opacity-30 transition-all flex items-center justify-center gap-2 ${isDark ? 'bg-[#3CBFA0]/10 text-[#3CBFA0] hover:bg-[#3CBFA0]/20' : 'bg-teal-50 text-[#126650] hover:bg-teal-100'}`}
                        >
                          <RefreshCw size={20} /> Compare
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={resultImage ? downloadImage : downloadAudio} 
                          className="py-6 rounded-2xl bg-[#126650] text-white font-black shadow-2xl shadow-[#126650]/20 hover:bg-[#0D2621] transition-all flex items-center justify-center gap-3"
                        >
                          <Download size={24} /> Download
                        </motion.button>
                      </div>
                    </div>
                  )
                ) : mode === 'decode' ? (
                  !decodedMessage && (
                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={(!selectedImage && !audioBuffer) || isProcessing}
                      onClick={handleDecode}
                      className="w-full py-6 rounded-2xl bg-gradient-to-r from-[#3CBFA0] to-[#21F4BD] text-white font-black text-xl shadow-2xl shadow-[#3CBFA0]/20 hover:scale-[1.01] disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                    >
                      {isProcessing ? <RefreshCw className="animate-spin" /> : <Unlock size={24} />}
                      {isProcessing ? 'Decoding...' : 'Secure Extract'}
                    </motion.button>
                  )
                ) : (
                  <div className="space-y-6">
                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={!selectedImage || isProcessing}
                      onClick={handleAnalyze}
                      className="w-full py-6 rounded-2xl bg-gradient-to-r from-[#126650] to-[#21F4BD] text-white font-black text-xl shadow-2xl shadow-[#126650]/20 hover:scale-[1.01] disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                    >
                      {isProcessing ? <RefreshCw className="animate-spin" /> : <Maximize2 size={24} />}
                      {isProcessing ? 'Analyzing...' : 'Generate Visualization'}
                    </motion.button>

                    {analysisResult && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                      >
                        <div className="flex gap-2 mb-4">
                          {['all', 'red', 'green', 'blue', 'heatmap'].map((ch) => (
                            <button
                              key={ch}
                              onClick={() => {
                                setAnalysisChannel(ch as any);
                                setAnalysisResult(ch === 'all' ? analysisResult : (analysisResults as any)[ch]);
                              }}
                              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${analysisChannel === ch ? 'bg-[#126650] text-white' : isDark ? 'bg-white/5 text-white/40' : 'bg-teal-50 text-[#3CBFA0]'}`}
                            >
                              {ch}
                            </button>
                          ))}
                        </div>
                        <div className={`aspect-video rounded-3xl overflow-hidden border-2 shadow-2xl ${isDark ? 'bg-slate-900 border-[#21F4BD]/30' : 'bg-white border-teal-100'}`}>
                          <img src={analysisChannel === 'all' ? analysisResult : (analysisResults as any)[analysisChannel]} className="w-full h-full object-contain" alt="Bit Plane Visualization" />
                        </div>
                        <div className="flex gap-4">
                           <motion.button 
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = analysisChannel === 'all' ? analysisResult : (analysisResults as any)[analysisChannel];
                                link.download = `bit_plane_${bitPlane}_${analysisChannel}.png`;
                                link.click();
                              }}
                              className="flex-1 py-4 rounded-2xl bg-[#126650] text-white font-black hover:bg-[#0D2621] transition-all flex items-center justify-center gap-2"
                           >
                              <Download size={20} /> Save Visualization
                           </motion.button>
                           <motion.button 
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => { setAnalysisResult(null); setAnalysisResults(null); }}
                              className={`flex-1 py-4 rounded-2xl font-black transition-all ${isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                           >
                              Clear
                           </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        {/* Image Comparison Modal */}
        <AnimatePresence>
          {showCompare && resultImage && selectedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center bg-[#081A16]/95 backdrop-blur-xl p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`max-w-5xl w-full rounded-[3rem] border p-10 shadow-2xl space-y-8 relative overflow-hidden transition-colors duration-700 ${isDark ? 'bg-[#0D2621] border-white/5' : 'bg-white border-teal-100'}`}
              >
                <div className={`absolute top-0 right-0 w-96 h-96 ${isDark ? 'bg-[#21F4BD]/10' : 'bg-[#21F4BD]/5'} blur-[100px] rounded-full -mr-48 -mt-48`} />
                
                <div className="flex items-center justify-between relative z-10">
                  <h2 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#126650]'}`}>Visual Comparison</h2>
                  <button 
                    onClick={() => setShowCompare(false)}
                    className={`p-3 rounded-2xl transition-all ${isDark ? 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10' : 'bg-teal-50 text-[#126650] hover:bg-teal-100'}`}
                  >
                    <ArrowLeft size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                  <div className="space-y-4">
                    <p className={`text-xs font-black uppercase tracking-widest text-center ${isDark ? 'text-white/40' : 'text-[#3CBFA0]'}`}>Original Carrier</p>
                    <div className={`aspect-video rounded-3xl overflow-hidden border ${isDark ? 'bg-black/20 border-white/5' : 'bg-teal-50/30 border-teal-100'}`}>
                      <img src={selectedImage} className="w-full h-full object-contain" alt="Original" />
                    </div>
                    {histograms && (
                      <div className="space-y-1">
                        <p className={`text-[9px] font-black uppercase ${isDark ? 'text-white/20' : 'text-[#3CBFA0]/50'}`}>Histogram Distribution</p>
                        <HistogramView data={histograms.original.r} color="#ef4444" />
                        <HistogramView data={histograms.original.g} color="#10b981" />
                        <HistogramView data={histograms.original.b} color="#4f46e5" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <p className={`text-xs font-black uppercase tracking-widest text-center ${isDark ? 'text-white/40' : 'text-[#3CBFA0]'}`}>Encoded Result</p>
                    <div className={`aspect-video rounded-3xl overflow-hidden border ${isDark ? 'bg-black/20 border-white/5' : 'bg-teal-50/30 border-teal-100'}`}>
                      <img src={resultImage} className="w-full h-full object-contain" alt="Encoded" />
                    </div>
                    {histograms && (
                      <div className="space-y-1">
                        <p className={`text-[9px] font-black uppercase ${isDark ? 'text-white/20' : 'text-[#3CBFA0]/50'}`}>Histogram Distribution</p>
                        <HistogramView data={histograms.result.r} color="#ef4444" />
                        <HistogramView data={histograms.result.g} color="#10b981" />
                        <HistogramView data={histograms.result.b} color="#4f46e5" />
                      </div>
                    )}
                  </div>
                </div>

                <div className={`p-8 rounded-3xl border text-center relative z-10 ${isDark ? 'bg-white/5 border-white/5' : 'bg-teal-50/50 border-teal-100'}`}>
                  <p className={`text-sm font-bold leading-relaxed ${isDark ? 'text-white/60' : 'text-[#126650]'}`}>
                    Notice any difference? Our chaotic mapping ensures that even with high-capacity data, 
                    the visual integrity of your image remains indistinguishable to the human eye.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modern Forest Footer */}
      <footer className={`relative z-10 transition-colors duration-700 pt-24 pb-12 overflow-hidden ${isDark ? 'bg-[#081A16] border-t border-white/5' : 'bg-white border-t border-teal-100'}`}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#21F4BD]/5 blur-[100px] rounded-full -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#126650]/5 blur-[100px] rounded-full -ml-48 -mb-48" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
            {/* Brand Column */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#126650] to-[#21F4BD] flex items-center justify-center text-white shadow-lg shadow-[#126650]/20">
                  <Shield size={22} />
                </div>
                <div>
                  <h1 className={`text-xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-[#126650]'}`}>STEGANO<span className="text-[#21F4BD]">PRO</span></h1>
                  <p className={`text-[9px] font-black tracking-[0.3em] ${isDark ? 'text-white/40' : 'text-[#3CBFA0]'} uppercase`}>Elite Forest Defense</p>
                </div>
              </div>
              <p className={`text-sm font-medium leading-relaxed ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                The world's most advanced forest-themed steganography suite. Secure your data within images and audio using chaotic bit mapping and AES-256 encryption.
              </p>
              <div className="flex items-center gap-4">
                {[Twitter, Github, Linkedin, Globe].map((Icon, i) => (
                  <button key={i} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isDark ? 'bg-white/5 text-white/40 hover:text-[#21F4BD] hover:bg-white/10' : 'bg-teal-50 text-[#126650] hover:bg-[#126650] hover:text-white'}`}>
                    <Icon size={18} />
                  </button>
                ))}
              </div>
            </div>

            {/* Links Columns */}
            <div>
              <h4 className={`text-xs font-black uppercase tracking-[0.2em] mb-6 ${isDark ? 'text-white' : 'text-[#126650]'}`}>Operations</h4>
              <ul className="space-y-4">
                {['Secure Encode', 'Secure Decode', 'Neural Analysis', 'Compare Carriers'].map((item) => (
                  <li key={item}>
                    <button onClick={() => setMode(item.toLowerCase().includes('encode') ? 'encode' : item.toLowerCase().includes('decode') ? 'decode' : 'analyze' as any)} className={`text-sm font-bold transition-colors ${isDark ? 'text-white/40 hover:text-[#21F4BD]' : 'text-[#3CBFA0] hover:text-[#126650]'}`}>
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className={`text-xs font-black uppercase tracking-[0.2em] mb-6 ${isDark ? 'text-white' : 'text-[#126650]'}`}>Intelligence</h4>
              <ul className="space-y-4">
                {['Documentation', 'Security Protocols', 'Chaotic Mapping', 'AES-256 GCM'].map((item) => (
                  <li key={item}>
                    <button className={`text-sm font-bold transition-colors ${isDark ? 'text-white/40 hover:text-[#21F4BD]' : 'text-[#3CBFA0] hover:text-[#126650]'}`}>
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter Column */}
            <div className="space-y-6">
              <h4 className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-white' : 'text-[#126650]'}`}>Secure Updates</h4>
              <p className={`text-sm font-medium ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Receive encrypted intelligence briefings.</p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="operator@stegano.pro" 
                  className={`flex-1 px-4 py-3 rounded-xl text-xs font-bold border outline-none transition-all ${isDark ? 'bg-white/5 border-white/5 focus:border-[#21F4BD]/50 text-white' : 'bg-teal-50 border-teal-100 focus:border-[#126650] text-[#126650]'}`}
                />
                <button className="px-4 py-3 rounded-xl bg-[#126650] text-white hover:bg-[#0D2621] transition-all">
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className={`mt-24 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-6 ${isDark ? 'border-white/5' : 'border-teal-50'}`}>
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/20' : 'text-[#3CBFA0]'}`}>
              © 2026 STEGANOPRO SYSTEMS. ALL RIGHTS RESERVED.
            </p>
            <div className="flex items-center gap-8">
              <button className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/20 hover:text-white' : 'text-[#3CBFA0] hover:text-[#126650]'}`}>Privacy Policy</button>
              <button className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/20 hover:text-white' : 'text-[#3CBFA0] hover:text-[#126650]'}`}>Terms of Service</button>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#21F4BD] animate-pulse" />
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#21F4BD]' : 'text-[#126650]'}`}>Network Secure</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

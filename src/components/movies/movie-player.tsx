"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Movie } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ArrowLeft,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatDurationSeconds } from "@/lib/utils/formatters";

interface MoviePlayerProps {
  movie: Movie;
  initialTime?: number;
  quality?: "720p" | "1080p" | "4k";
  onTimeUpdate?: (time: number) => void;
  sceneVideos?: string[]; // URLs de escenas para reproducir en secuencia
}

export function MoviePlayer({
  movie,
  initialTime = 0,
  quality = "1080p",
  onTimeUpdate,
  sceneVideos,
}: MoviePlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [currentQuality, setCurrentQuality] = useState(quality);
  
  // Estado para reproducción secuencial de escenas
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [sceneDurations, setSceneDurations] = useState<number[]>([]);

  // ⭐ IMPORTANTE: También usar video_url como fallback (video ensamblado)
  // Si hay sceneVideos, usar el primero como video principal inicial
  const videoUrl =
    sceneVideos && sceneVideos.length > 0
      ? sceneVideos[currentSceneIndex]
      : currentQuality === "720p"
      ? movie.video_url_720p || movie.video_url
      : currentQuality === "1080p"
      ? movie.video_url_1080p || movie.video_url
      : movie.video_url_4k || movie.video_url;
  
  // Efecto para cambiar de escena cuando cambia currentSceneIndex
  useEffect(() => {
    if (sceneVideos && sceneVideos.length > 0 && videoRef.current) {
      const newUrl = sceneVideos[currentSceneIndex];
      const currentSrc = videoRef.current.src || videoRef.current.currentSrc;
      
      // Comparar solo la parte relevante de la URL (sin parámetros de query que pueden cambiar)
      const currentSrcBase = currentSrc ? new URL(currentSrc).pathname : '';
      const newUrlBase = newUrl ? new URL(newUrl).pathname : '';
      
      if (newUrl && currentSrcBase !== newUrlBase) {
        console.log(`[MOVIE PLAYER] Loading scene ${currentSceneIndex + 1}/${sceneVideos.length}: ${newUrl.substring(0, 100)}...`);
        
        // Pausar primero si está reproduciendo
        const wasPlaying = !videoRef.current.paused;
        videoRef.current.pause();
        
        // Cambiar la fuente
        videoRef.current.src = newUrl;
        videoRef.current.load();
        setCurrentTime(0);
        
        // Reproducir automáticamente si estaba reproduciendo
        if (wasPlaying) {
          videoRef.current.play().catch(err => {
            console.error('[MOVIE PLAYER] Error playing next scene:', err);
          });
        }
      }
    }
  }, [currentSceneIndex, sceneVideos]);

  // Log para debug
  useEffect(() => {
    if (!videoUrl) {
      console.error('[MOVIE PLAYER] No video URL available');
      console.error('[MOVIE PLAYER] Movie video fields:', {
        video_url: movie.video_url,
        video_url_720p: movie.video_url_720p,
        video_url_1080p: movie.video_url_1080p,
        video_url_4k: movie.video_url_4k,
        currentQuality
      });
    } else {
      console.log('[MOVIE PLAYER] Using video URL:', videoUrl.substring(0, 100));
      if (sceneVideos && sceneVideos.length > 0) {
        console.log(`[MOVIE PLAYER] Sequential playback mode: ${sceneVideos.length} scenes`);
      }
    }
  }, [videoUrl, movie, currentQuality, sceneVideos]);

  // Hide controls after 3 seconds
  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, showControls]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seek(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          seek(10);
          break;
        case "ArrowUp":
          e.preventDefault();
          changeVolume(0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          changeVolume(-0.1);
          break;
        case "KeyF":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "KeyM":
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
    resetControlsTimeout();
  };

  const seek = (seconds: number) => {
    if (!videoRef.current) return;
    
    if (sceneVideos && sceneVideos.length > 0 && totalDuration > 0) {
      // Navegar entre escenas si es necesario
      const targetTotalTime = getTotalCurrentTime() + seconds;
      const clampedTime = Math.max(0, Math.min(totalDuration, targetTotalTime));
      
      // Encontrar en qué escena está el tiempo objetivo
      let accumulated = 0;
      let targetSceneIndex = 0;
      let targetSceneTime = 0;
      
      for (let i = 0; i < sceneDurations.length; i++) {
        const sceneDur = sceneDurations[i] || 0;
        if (accumulated + sceneDur >= clampedTime) {
          targetSceneIndex = i;
          targetSceneTime = clampedTime - accumulated;
          break;
        }
        accumulated += sceneDur;
        if (i === sceneDurations.length - 1) {
          targetSceneIndex = i;
          targetSceneTime = sceneDur;
        }
      }
      
      if (targetSceneIndex !== currentSceneIndex) {
        setCurrentSceneIndex(targetSceneIndex);
        if (videoRef.current) {
          videoRef.current.load();
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.currentTime = targetSceneTime;
              if (isPlaying) {
                videoRef.current.play();
              }
            }
          }, 100);
        }
      } else {
        videoRef.current.currentTime = targetSceneTime;
        setCurrentTime(targetSceneTime);
      }
    } else {
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(duration, currentTime + seconds)
      );
    }
    resetControlsTimeout();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const targetTotalTime = parseFloat(e.target.value);
    
    if (sceneVideos && sceneVideos.length > 0 && totalDuration > 0) {
      // Navegar a la escena correcta
      let accumulated = 0;
      let targetSceneIndex = 0;
      let targetSceneTime = 0;
      
      for (let i = 0; i < sceneDurations.length; i++) {
        const sceneDur = sceneDurations[i] || 0;
        if (accumulated + sceneDur >= targetTotalTime) {
          targetSceneIndex = i;
          targetSceneTime = targetTotalTime - accumulated;
          break;
        }
        accumulated += sceneDur;
        if (i === sceneDurations.length - 1) {
          targetSceneIndex = i;
          targetSceneTime = sceneDur;
        }
      }
      
      if (targetSceneIndex !== currentSceneIndex) {
        setCurrentSceneIndex(targetSceneIndex);
        if (videoRef.current) {
          videoRef.current.load();
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.currentTime = targetSceneTime;
              setCurrentTime(targetSceneTime);
              if (isPlaying) {
                videoRef.current.play();
              }
            }
          }, 100);
        }
      } else {
        videoRef.current.currentTime = targetSceneTime;
        setCurrentTime(targetSceneTime);
      }
    } else {
      videoRef.current.currentTime = targetTotalTime;
      setCurrentTime(targetTotalTime);
    }
    resetControlsTimeout();
  };

  const changeVolume = (delta: number) => {
    const newVolume = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    resetControlsTimeout();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    resetControlsTimeout();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    resetControlsTimeout();
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    if (onTimeUpdate) {
      onTimeUpdate(time);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const videoDuration = videoRef.current.duration;
    
    if (sceneVideos && sceneVideos.length > 0) {
      // Calcular duración total de todas las escenas
      const newSceneDurations = [...sceneDurations];
      newSceneDurations[currentSceneIndex] = videoDuration;
      setSceneDurations(newSceneDurations);
      
      const total = newSceneDurations.reduce((sum, d) => sum + (d || 0), 0);
      setTotalDuration(total);
      setDuration(total > 0 ? total : videoDuration);
      
      console.log(`[MOVIE PLAYER] Scene ${currentSceneIndex + 1}/${sceneVideos.length} loaded, duration: ${videoDuration}s, total: ${total}s`);
    } else {
      setDuration(videoDuration);
    }
    
    if (initialTime > 0) {
      videoRef.current.currentTime = initialTime;
    }
  };
  
  // Manejar cuando termina una escena y pasar a la siguiente
  const handleVideoEnded = () => {
    if (sceneVideos && sceneVideos.length > 0 && currentSceneIndex < sceneVideos.length - 1) {
      console.log(`[MOVIE PLAYER] Scene ${currentSceneIndex + 1} ended, moving to scene ${currentSceneIndex + 2}`);
      setCurrentSceneIndex(currentSceneIndex + 1);
      if (videoRef.current) {
        videoRef.current.load(); // Recargar el video con la nueva URL
        setTimeout(() => {
          if (videoRef.current && isPlaying) {
            videoRef.current.play();
          }
        }, 100);
      }
    } else {
      setIsPlaying(false);
      console.log('[MOVIE PLAYER] All scenes completed');
    }
  };
  
  // Calcular tiempo actual considerando todas las escenas
  const getTotalCurrentTime = (): number => {
    if (!sceneVideos || sceneVideos.length === 0) {
      return currentTime;
    }
    
    // Sumar duraciones de escenas anteriores + tiempo actual de la escena actual
    const previousDurations = sceneDurations.slice(0, currentSceneIndex).reduce((sum, d) => sum + (d || 0), 0);
    return previousDurations + currentTime;
  };

  const progress = totalDuration > 0 ? (getTotalCurrentTime() / totalDuration) * 100 : (duration > 0 ? (currentTime / duration) * 100 : 0);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black"
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={videoUrl || undefined}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleVideoEnded}
        onError={(e) => {
          console.error('[MOVIE PLAYER] ==========================================');
          console.error('[MOVIE PLAYER] ❌ Video playback error');
          console.error('[MOVIE PLAYER] Video URL:', videoUrl?.substring(0, 150));
          const video = e.currentTarget;
          if (video.error) {
            console.error('[MOVIE PLAYER] Error code:', video.error.code);
            console.error('[MOVIE PLAYER] Error message:', video.error.message);
            
            // Errores comunes y sus soluciones
            if (video.error.code === 4) {
              console.error('[MOVIE PLAYER] MEDIA_ELEMENT_ERROR: Format error - Video format not supported');
            } else if (video.error.code === 2) {
              console.error('[MOVIE PLAYER] NETWORK_ERROR: Network error - Check CORS and URL accessibility');
            } else if (video.error.code === 3) {
              console.error('[MOVIE PLAYER] DECODE_ERROR: Decode error - Video file may be corrupted');
            }
          }
          console.error('[MOVIE PLAYER] ==========================================');
        }}
        crossOrigin={sceneVideos ? undefined : "anonymous"}
        preload="metadata"
        playsInline
      />

      {/* Back Button */}
      <div
        className={cn(
          "absolute top-4 left-4 z-20 transition-opacity",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Controls Overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity z-10",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          {/* Progress Bar */}
          <input
            type="range"
            min="0"
            max={totalDuration > 0 ? totalDuration : (duration || 0)}
            value={getTotalCurrentTime()}
            onChange={handleSeek}
            className="w-full h-1 bg-foreground-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          
          {/* Scene indicator */}
          {sceneVideos && sceneVideos.length > 1 && (
            <div className="text-xs text-foreground-muted text-center">
              Escena {currentSceneIndex + 1} de {sceneVideos.length}
            </div>
          )}

          {/* Controls Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="h-10 w-10"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="h-10 w-10"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => {
                  const newVolume = parseFloat(e.target.value);
                  setVolume(newVolume);
                  if (videoRef.current) {
                    videoRef.current.volume = newVolume;
                  }
                }}
                className="w-20 h-1 bg-foreground-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />

              <div className="text-sm text-foreground-muted">
                {formatDurationSeconds(getTotalCurrentTime())} / {formatDurationSeconds(totalDuration > 0 ? totalDuration : duration)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Quality Selector */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="h-10 w-10"
                >
                  <Settings className="h-5 w-5" />
                </Button>
                {showQualityMenu && (
                  <div className="absolute bottom-12 right-0 bg-card border border-border rounded-lg shadow-card overflow-hidden min-w-[100px]">
                    {["720p", "1080p", "4k"].map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          setCurrentQuality(q as "720p" | "1080p" | "4k");
                          setShowQualityMenu(false);
                        }}
                        className={cn(
                          "w-full px-4 py-2 text-left text-sm hover:bg-card-hover transition-colors",
                          currentQuality === q && "bg-primary/20 text-primary"
                        )}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="h-10 w-10"
              >
                {isFullscreen ? (
                  <Minimize className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

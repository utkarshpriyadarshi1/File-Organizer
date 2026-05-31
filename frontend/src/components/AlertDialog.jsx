import React, { useEffect } from "react";

const AlertDialog = ({ config }) => {
    // Handle escape key to close
    useEffect(() => {
        if (!config || !config.onClose) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                config.onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [config]);

    // If there is no active alert, do not render anything
    if (!config) return null;

    const { message, title, type, onClose } = config;

    // Theme mapping based on alert type with radial glow and custom borders
    let theme = {
        icon: "fa-solid fa-circle-info",
        iconContainerBg: "bg-blue-50 text-blue-600 border-blue-100",
        buttonBg: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20",
        borderAccent: "border-t-[6px] border-t-blue-500",
        pillText: "text-blue-700 bg-blue-50 border-blue-100"
    };

    if (type === "success") {
        theme = {
            icon: "fa-solid fa-circle-check",
            iconContainerBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
            buttonBg: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20",
            borderAccent: "border-t-[6px] border-t-emerald-500",
            pillText: "text-emerald-700 bg-emerald-50 border-emerald-100"
        };
    } else if (type === "error") {
        theme = {
            icon: "fa-solid fa-circle-xmark",
            iconContainerBg: "bg-rose-50 text-rose-600 border-rose-100",
            buttonBg: "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-500/20",
            borderAccent: "border-t-[6px] border-t-rose-500",
            pillText: "text-rose-700 bg-rose-50 border-rose-100"
        };
    } else if (type === "warning") {
        theme = {
            icon: "fa-solid fa-triangle-exclamation",
            iconContainerBg: "bg-amber-50 text-amber-600 border-amber-100",
            buttonBg: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/20",
            borderAccent: "border-t-[6px] border-t-amber-500",
            pillText: "text-amber-700 bg-amber-50 border-amber-100"
        };
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur Overlay */}
            <div 
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-[6px] transition-opacity duration-300"
                onClick={onClose}
            ></div>
            
            {/* Modal Dialog Content Container */}
            <div className={`relative bg-white/95 backdrop-blur-xl border border-white/80 rounded-[32px] shadow-[0_32px_80px_rgba(15,23,42,0.22)] max-w-sm w-full p-7 text-center transform transition-all duration-300 scale-100 opacity-100 flex flex-col items-center gap-5 ${theme.borderAccent}`}>
                
                {/* Visual Icon Header with Radial Glow */}
                <div className={`w-16 h-16 rounded-2xl ${theme.iconContainerBg} border flex items-center justify-center text-3xl shadow-inner relative`}>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-2xl bg-current opacity-[0.03]"></span>
                    <i className={theme.icon}></i>
                </div>

                {/* Dialog Title & Message */}
                <div className="space-y-2">
                    <div className="flex justify-center">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${theme.pillText}`}>
                            {type}
                        </span>
                    </div>
                    <h3 className="text-base font-black text-slate-800 tracking-tight mt-1">
                        {title}
                    </h3>
                    <p className="text-xs text-slate-500 font-bold leading-relaxed px-1">
                        {message}
                    </p>
                </div>

                {/* Confirm Action Button */}
                <button
                    onClick={onClose}
                    className={`w-full py-3.5 px-5 text-xs font-black text-white rounded-2xl transition-all duration-150 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-md cursor-pointer ${theme.buttonBg}`}
                >
                    Acknowledge
                </button>
            </div>
        </div>
    );
};

export default AlertDialog;

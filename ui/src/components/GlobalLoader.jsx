import React from "react";

const GlobalLoader = ({ message }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md transition-opacity duration-300">
            <div className="bg-white/80 border border-white/20 shadow-2xl rounded-2xl p-8 max-w-sm text-center flex flex-col items-center">
                {/* Custom premium loader spinner */}
                <div className="w-16 h-16 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-800">Processing...</h3>
                {message && <p className="mt-2 text-sm text-gray-500">{message}</p>}
            </div>
        </div>
    );
};

export default GlobalLoader;

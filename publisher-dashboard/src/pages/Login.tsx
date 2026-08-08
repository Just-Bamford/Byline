import React, { useState } from "react";
import { AlertCircle, Loader } from "lucide-react";

interface LoginPageProps {}

export const LoginPage: React.FC<LoginPageProps> = () => {
  const [publisherAddress, setPublisherAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publisherAddress.trim()) {
      setError("Please enter your Stellar address");
      return;
    }

    if (!publisherAddress.startsWith("G")) {
      setError("Invalid Stellar address format");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // In production, this would authenticate with the backend
      // For now, we just store the address
      const mockToken = `token_${Date.now()}`;

      localStorage.setItem("auth_token", mockToken);
      localStorage.setItem("publisher_address", publisherAddress);

      // Refresh page to load dashboard
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to authenticate");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Byline</h1>
            <p className="mt-2 text-gray-600">Publisher Dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Stellar Address
              </label>
              <input
                type="text"
                id="address"
                value={publisherAddress}
                onChange={(e) => setPublisherAddress(e.target.value)}
                placeholder="GABC...XYZ"
                disabled={isLoading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Your Stellar account that publishes articles
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading && <Loader className="h-4 w-4 animate-spin" />}
              {isLoading ? "Connecting..." : "Connect Wallet"}
            </button>
          </form>

          {/* Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-600 text-center">
              Connect with your Stellar account to manage your published
              articles, track earnings, and register new content.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white text-xs mt-8">
          © 2024 Byline. A decentralized publishing platform on Stellar.
        </p>
      </div>
    </div>
  );
};

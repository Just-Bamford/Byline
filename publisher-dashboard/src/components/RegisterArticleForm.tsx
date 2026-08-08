import React, { useState } from "react";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";
import { ArticleRegistrationInput } from "../types";

interface RegisterArticleFormProps {
  onSubmit: (data: ArticleRegistrationInput) => Promise<void>;
  isLoading?: boolean;
}

type SubmissionState = "idle" | "loading" | "success" | "error";

export const RegisterArticleForm: React.FC<RegisterArticleFormProps> = ({
  onSubmit,
  isLoading = false,
}) => {
  const [state, setState] = useState<SubmissionState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState<ArticleRegistrationInput>({
    articleId: "",
    title: "",
    price: 0,
    priceType: "stroops",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "price" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.articleId.trim()) {
      setErrorMessage("Article ID is required");
      return;
    }
    if (!formData.title.trim()) {
      setErrorMessage("Article title is required");
      return;
    }
    if (formData.price <= 0) {
      setErrorMessage("Price must be greater than 0");
      return;
    }

    setState("loading");
    setErrorMessage("");

    try {
      await onSubmit(formData);
      setState("success");
      setFormData({
        articleId: "",
        title: "",
        price: 0,
        priceType: "stroops",
      });

      // Reset success message after 5 seconds
      setTimeout(() => setState("idle"), 5000);
    } catch (error) {
      setState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to register article",
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Register New Article
      </h3>

      {/* Article ID */}
      <div className="mb-4">
        <label
          htmlFor="articleId"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Article ID *
        </label>
        <input
          type="text"
          id="articleId"
          name="articleId"
          value={formData.articleId}
          onChange={handleChange}
          placeholder="e.g., investigative-report-2024"
          disabled={isLoading || state === "loading"}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-gray-500">
          Unique identifier (lowercase, hyphens allowed)
        </p>
      </div>

      {/* Title */}
      <div className="mb-4">
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Article Title *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g., Breaking: New Policy Changes"
          disabled={isLoading || state === "loading"}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Price & Type */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label
            htmlFor="price"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Price *
          </label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price || ""}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            disabled={isLoading || state === "loading"}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label
            htmlFor="priceType"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Currency *
          </label>
          <select
            id="priceType"
            name="priceType"
            value={formData.priceType}
            onChange={handleChange}
            disabled={isLoading || state === "loading"}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
          >
            <option value="stroops">Stroops (XLM)</option>
            <option value="usdc">USDC</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {state === "error" && errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* Success Message */}
      {state === "success" && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-2">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">
            Article registered successfully! Transaction submitted to
            blockchain.
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || state === "loading"}
        className="w-full bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        {state === "loading" && <Loader className="h-4 w-4 animate-spin" />}
        {state === "loading" ? "Registering..." : "Register Article"}
      </button>

      <p className="mt-3 text-xs text-gray-500 text-center">
        This will submit a transaction to the Soroban smart contract
      </p>
    </form>
  );
};

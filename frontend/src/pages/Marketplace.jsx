import React, { useState, useEffect } from "react";
import {
  Download,
  Star,
  Upload,
  Filter,
  Search,
  MessageCircle,
  X,
} from "lucide-react";

const Marketplace = () => {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: "",
    description: "",
    type: "template",
    content: "",
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [filter, searchTerm]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      let url = `${import.meta.env.VITE_API_URL}/api/marketplace/items`;
      if (filter !== "all") {
        url += `?type=${filter}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      // Filter by search term client-side (simple)
      const filtered = data.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setItems(filtered);
    } catch (err) {
      console.error("Failed to fetch marketplace items", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (itemId) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/marketplace/items/${itemId}/reviews`,
      );
      const data = await res.json();
      setReviews(data);
    } catch (err) {
      console.error("Failed to fetch reviews", err);
    }
  };

  const openItem = (item) => {
    setSelectedItem(item);
    fetchReviews(item.id);
    setShowReviewModal(true);
  };

  const downloadItem = async (id) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/marketplace/items/${id}/download`,
        {
          method: "POST",
        },
      );
      const data = await res.json();
      alert("Item downloaded!");
      fetchItems(); // refresh to update download count
    } catch (err) {
      alert("Download failed");
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/marketplace/items/${selectedItem.id}/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(reviewForm),
        },
      );
      if (res.ok) {
        alert("Review submitted!");
        fetchReviews(selectedItem.id);
        fetchItems(); // update average rating
        setReviewForm({ rating: 5, comment: "" });
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to submit review");
      }
    } catch (err) {
      alert("Error submitting review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/marketplace/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...uploadForm,
            content: JSON.parse(uploadForm.content),
          }),
        },
      );
      if (res.ok) {
        setShowUpload(false);
        fetchItems();
        alert("Item published!");
      } else {
        alert("Failed to publish");
      }
    } catch (err) {
      alert("Error publishing");
    }
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const stars = [];
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} size={16} className="text-yellow-500 fill-current" />,
        );
      } else if (i === fullStars && halfStar) {
        stars.push(<Star key={i} size={16} className="text-yellow-500 half" />);
      } else {
        stars.push(<Star key={i} size={16} className="text-gray-400" />);
      }
    }
    return <div className="flex items-center">{stars}</div>;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Community Marketplace</h1>
        <button
          onClick={() => setShowUpload(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
        >
          <Upload size={16} /> Publish
        </button>
      </div>

      {/* Search and filter bar */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-gray-800/50 border-gray-700/50 text-white"
          />
        </div>
        <div className="flex gap-2 mb-4">
          <span className="text-sm text-gray-400 mr-2">Category:</span>
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1 rounded text-sm ${categoryFilter === "all" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300"}`}
          >
            All
          </button>
          <button
            onClick={() => setCategoryFilter("frontend")}
            className={`px-3 py-1 rounded text-sm ${categoryFilter === "frontend" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300"}`}
          >
            Frontend
          </button>
          <button
            onClick={() => setCategoryFilter("backend")}
            className={`px-3 py-1 rounded text-sm ${categoryFilter === "backend" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300"}`}
          >
            Backend
          </button>
          <button
            onClick={() => setCategoryFilter("utility")}
            className={`px-3 py-1 rounded text-sm ${categoryFilter === "utility" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300"}`}
          >
            Utility
          </button>
          <button
            onClick={() => setCategoryFilter("other")}
            className={`px-3 py-1 rounded text-sm ${categoryFilter === "other" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300"}`}
          >
            Other
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded ${filter === "all" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("template")}
            className={`px-4 py-2 rounded ${filter === "template" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300"}`}
          >
            Templates
          </button>
          <button
            onClick={() => setFilter("agent")}
            className={`px-4 py-2 rounded ${filter === "agent" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300"}`}
          >
            Agents
          </button>
        </div>
      </div>

      {loading && <p className="text-center text-gray-400">Loading...</p>}

      {!loading && items.length === 0 && (
        <p className="text-center text-gray-500">No items found.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="border rounded-lg p-4 shadow hover:shadow-lg transition bg-gray-800/30 border-gray-700/30 cursor-pointer"
            onClick={() => openItem(item)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {item.name}
                </h3>
                <p className="text-gray-400 text-sm mb-2">{item.description}</p>
                <span className="inline-block px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded">
                  {item.type}
                </span>
                <span className="ml-2 inline-block px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded">
                  {item.category}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {renderStars(item.rating)}
                <span className="text-sm text-gray-400 ml-1">
                  ({item.downloads})
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center mt-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openItem(item);
                  }}
                  className="text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-2 py-1 rounded"
                >
                  <MessageCircle size={14} className="inline mr-1" /> Reviews
                </button>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadItem(item.id);
                }}
                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                <Download size={14} /> Get
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Publish to Marketplace</h2>
            <form onSubmit={handleUpload}>
              <input
                type="text"
                placeholder="Name"
                value={uploadForm.name}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, name: e.target.value })
                }
                className="w-full p-2 border rounded mb-2 bg-gray-800 border-gray-700 text-white"
                required
              />
              <textarea
                placeholder="Description"
                value={uploadForm.description}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, description: e.target.value })
                }
                className="w-full p-2 border rounded mb-2 bg-gray-800 border-gray-700 text-white"
                rows="3"
                required
              />
              <select
                value={uploadForm.type}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, type: e.target.value })
                }
                className="w-full p-2 border rounded mb-2 bg-gray-800 border-gray-700 text-white"
              >
                <option value="template">Template</option>
                <option value="agent">Agent</option>
              </select>
              <textarea
                placeholder="Content (JSON)"
                value={uploadForm.content}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, content: e.target.value })
                }
                className="w-full p-2 border rounded mb-4 font-mono text-sm bg-gray-800 border-gray-700 text-white"
                rows="6"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="px-4 py-2 bg-gray-700 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded"
                >
                  Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review modal */}
      {showReviewModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {selectedItem.name} - Reviews
              </h2>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Review list */}
            <div className="mb-4 max-h-60 overflow-y-auto">
              {reviews.length === 0 && (
                <p className="text-gray-400">No reviews yet.</p>
              )}
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="border-b border-gray-700 pb-2 mb-2"
                >
                  <div className="flex items-center gap-2">
                    {renderStars(rev.rating)}
                    <span className="text-sm text-gray-400">
                      {rev.user?.username || "Anonymous"}
                    </span>
                  </div>
                  {rev.comment && (
                    <p className="text-sm text-gray-300 mt-1">{rev.comment}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {new Date(rev.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Add review form (only if logged in) */}
            {localStorage.getItem("token") && (
              <form
                onSubmit={submitReview}
                className="border-t border-gray-700 pt-4"
              >
                <h3 className="text-lg font-semibold mb-2">Add Your Review</h3>
                <div className="mb-2">
                  <label className="block text-sm text-gray-400 mb-1">
                    Rating
                  </label>
                  <select
                    value={reviewForm.rating}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        rating: parseInt(e.target.value),
                      })
                    }
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} Star{n > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="block text-sm text-gray-400 mb-1">
                    Comment (optional)
                  </label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) =>
                      setReviewForm({ ...reviewForm, comment: e.target.value })
                    }
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white"
                    rows="3"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;

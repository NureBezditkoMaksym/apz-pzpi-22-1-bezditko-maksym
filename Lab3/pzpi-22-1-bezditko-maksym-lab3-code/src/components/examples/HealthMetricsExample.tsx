import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import type { TablesInsert, Tables } from "../../types/supabase";

const HealthMetricsExample: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Tables<"health_metrics">[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    steps: "",
    calories: "",
    water_ml: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("health_metrics")
        .select("*")
        .order("date", { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setMetrics(data || []);
        setError(null);
      }
    } catch (err) {
      setError("Failed to fetch metrics");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage("Please sign in to add health metrics");
      return;
    }

    const metricData: TablesInsert<"health_metrics"> = {
      date: formData.date,
      user_id: user.id,
      steps: formData.steps ? parseInt(formData.steps) : null,
      calories: formData.calories ? parseInt(formData.calories) : null,
      water_ml: formData.water_ml ? parseInt(formData.water_ml) : null,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("health_metrics")
          .update(metricData)
          .eq("metric_id", editingId);

        if (error) {
          setMessage(`Update error: ${error.message}`);
        } else {
          setMessage("Health metric updated successfully!");
          setEditingId(null);
          fetchMetrics();
        }
      } else {
        const { error } = await supabase
          .from("health_metrics")
          .insert(metricData);

        if (error) {
          setMessage(`Create error: ${error.message}`);
        } else {
          setMessage("Health metric added successfully!");
          fetchMetrics();
        }
      }

      setFormData({
        date: new Date().toISOString().split("T")[0],
        steps: "",
        calories: "",
        water_ml: "",
      });
    } catch (err) {
      setMessage("An unexpected error occurred");
    }
  };

  const handleEdit = (metric: Tables<"health_metrics">) => {
    setFormData({
      date: metric.date,
      steps: metric.steps?.toString() || "",
      calories: metric.calories?.toString() || "",
      water_ml: metric.water_ml?.toString() || "",
    });
    setEditingId(metric.metric_id);
  };

  const handleDelete = async (metricId: string) => {
    if (window.confirm("Are you sure you want to delete this health metric?")) {
      const { error } = await supabase
        .from("health_metrics")
        .delete()
        .eq("metric_id", metricId);

      if (error) {
        setMessage(`Delete error: ${error.message}`);
      } else {
        setMessage("Health metric deleted successfully!");
        fetchMetrics();
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      steps: "",
      calories: "",
      water_ml: "",
    });
  };

  if (!user) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Please sign in to manage your health metrics.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h2>Health Metrics</h2>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          marginBottom: "30px",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        <h3>{editingId ? "Edit Health Metric" : "Add New Health Metric"}</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "15px",
            marginBottom: "15px",
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Date:
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              required
              style={{ width: "100%", padding: "8px", fontSize: "14px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Steps:
            </label>
            <input
              type="number"
              placeholder="e.g., 10000"
              value={formData.steps}
              onChange={(e) =>
                setFormData({ ...formData, steps: e.target.value })
              }
              style={{ width: "100%", padding: "8px", fontSize: "14px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Calories:
            </label>
            <input
              type="number"
              placeholder="e.g., 2000"
              value={formData.calories}
              onChange={(e) =>
                setFormData({ ...formData, calories: e.target.value })
              }
              style={{ width: "100%", padding: "8px", fontSize: "14px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Water (ml):
            </label>
            <input
              type="number"
              placeholder="e.g., 2000"
              value={formData.water_ml}
              onChange={(e) =>
                setFormData({ ...formData, water_ml: e.target.value })
              }
              style={{ width: "100%", padding: "8px", fontSize: "14px" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="submit"
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            {editingId ? "Update Metric" : "Add Metric"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              style={{
                padding: "10px 20px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {message && (
        <div
          style={{
            padding: "10px",
            marginBottom: "20px",
            backgroundColor: message.includes("error") ? "#f8d7da" : "#d4edda",
            color: message.includes("error") ? "#721c24" : "#155724",
            borderRadius: "4px",
          }}
        >
          {message}
        </div>
      )}

      {/* Metrics List */}
      <div>
        <h3>Your Health Metrics</h3>

        {loading ? (
          <p>Loading metrics...</p>
        ) : error ? (
          <p style={{ color: "red" }}>Error: {error}</p>
        ) : !metrics || metrics.length === 0 ? (
          <p>No health metrics found. Add your first metric above!</p>
        ) : (
          <div style={{ display: "grid", gap: "15px" }}>
            {metrics
              .filter((metric) => metric.user_id === user.id)
              .map((metric) => (
                <div
                  key={metric.metric_id}
                  style={{
                    padding: "15px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    backgroundColor: "#f8f9fa",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <h4 style={{ margin: "0 0 10px 0" }}>{metric.date}</h4>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(150px, 1fr))",
                          gap: "10px",
                        }}
                      >
                        {metric.steps && (
                          <p>
                            <strong>Steps:</strong>{" "}
                            {metric.steps.toLocaleString()}
                          </p>
                        )}
                        {metric.calories && (
                          <p>
                            <strong>Calories:</strong> {metric.calories}
                          </p>
                        )}
                        {metric.water_ml && (
                          <p>
                            <strong>Water:</strong> {metric.water_ml}ml
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => handleEdit(metric)}
                        style={{
                          padding: "5px 10px",
                          backgroundColor: "#ffc107",
                          color: "black",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(metric.metric_id)}
                        style={{
                          padding: "5px 10px",
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthMetricsExample;

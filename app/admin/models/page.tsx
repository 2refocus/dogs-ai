"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { MODEL_SETTINGS, ModelType } from "@/lib/pipelineConfig";

interface ModelConfig {
  id: string;
  name: string;
  model: string;
  supportsAspectRatio: boolean;
  supportsUpscaling: boolean;
  maxInputSize: string;
  outputSize: string;
  scales?: number[];
  isActive: boolean;
  description?: string;
}

export default function ModelConfigPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);

  // Form state for adding/editing models
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    model: "",
    supportsAspectRatio: true,
    supportsUpscaling: false,
    maxInputSize: "1024x1024",
    outputSize: "1024x1024",
    scales: [] as number[],
    isActive: true,
    description: ""
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? null;
      setUserEmail(email);
      setIsAdmin(email === "admin@example.com" || (email?.includes("admin") ?? false));
    });
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      // Convert MODEL_SETTINGS to our format and add some additional models
      const defaultModels: ModelConfig[] = [
        {
          id: "nano-banana",
          name: "Nano Banana",
          model: "google/nano-banana",
          supportsAspectRatio: true,
          supportsUpscaling: false,
          maxInputSize: "1024x1024",
          outputSize: "1024x1024",
          isActive: true,
          description: "Fast, efficient model for quick generations"
        },
        {
          id: "sdxl",
          name: "Stable Diffusion XL",
          model: "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
          supportsAspectRatio: true,
          supportsUpscaling: false,
          maxInputSize: "1024x1024",
          outputSize: "1024x1024",
          isActive: true,
          description: "High-quality text-to-image generation"
        },
        {
          id: "seedream-4",
          name: "SeeDream-4",
          model: "bytedance/seedream-4",
          supportsAspectRatio: true,
          supportsUpscaling: true,
          maxInputSize: "4096x4096",
          outputSize: "4096x4096",
          scales: [2, 4],
          isActive: false,
          description: "Unified text-to-image generation and precise single-sentence editing at up to 4K resolution"
        },
        {
          id: "real-esrgan",
          name: "Real-ESRGAN",
          model: "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
          supportsAspectRatio: false,
          supportsUpscaling: true,
          maxInputSize: "2048x2048",
          outputSize: "4096x4096",
          scales: [2, 4],
          isActive: true,
          description: "High-quality image upscaling"
        }
      ];

      setModels(defaultModels);
    } catch (error) {
      setMessage("Error loading models");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingModel) {
        // Update existing model
        setModels(prev => prev.map(m => 
          m.id === editingModel.id ? { ...formData, id: editingModel.id } : m
        ));
        setMessage("Model updated successfully");
      } else {
        // Add new model
        const newModel: ModelConfig = {
          ...formData,
          id: formData.id || formData.name.toLowerCase().replace(/\s+/g, '-')
        };
        setModels(prev => [...prev, newModel]);
        setMessage("Model added successfully");
      }
      
      setShowAddForm(false);
      setEditingModel(null);
      resetForm();
    } catch (error) {
      setMessage("Error saving model");
    }
  };

  const handleEdit = (model: ModelConfig) => {
    setFormData({
      id: model.id,
      name: model.name,
      model: model.model,
      supportsAspectRatio: model.supportsAspectRatio,
      supportsUpscaling: model.supportsUpscaling,
      maxInputSize: model.maxInputSize,
      outputSize: model.outputSize,
      scales: model.scales || [],
      isActive: model.isActive,
      description: model.description || ""
    });
    setEditingModel(model);
    setShowAddForm(true);
  };

  const handleDelete = (modelId: string) => {
    if (confirm("Are you sure you want to delete this model?")) {
      setModels(prev => prev.filter(m => m.id !== modelId));
      setMessage("Model deleted successfully");
    }
  };

  const toggleActive = (modelId: string) => {
    setModels(prev => prev.map(m => 
      m.id === modelId ? { ...m, isActive: !m.isActive } : m
    ));
  };

  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      model: "",
      supportsAspectRatio: true,
      supportsUpscaling: false,
      maxInputSize: "1024x1024",
      outputSize: "1024x1024",
      scales: [],
      isActive: true,
      description: ""
    });
  };

  if (!userEmail) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="bg-[var(--muted)] rounded-xl p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
          <p className="mb-4">Please <a href="/login" className="link">sign in</a> to access admin features.</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="bg-[var(--muted)] rounded-xl p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="mb-4">You don't have admin privileges to access this page.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Model Configuration</h1>
            <p className="text-[var(--muted-foreground)]">
              Manage image generation models and their settings
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingModel(null);
              setShowAddForm(true);
            }}
            className="btn"
          >
            Add New Model
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.includes("Error") 
            ? "bg-red-500/10 text-red-400 border border-red-500/20" 
            : "bg-green-500/10 text-green-400 border border-green-500/20"
        }`}>
          {message}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-[var(--muted)] rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingModel ? "Edit Model" : "Add New Model"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Model ID</label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                  className="w-full p-3 rounded-lg border border-[var(--line)] bg-[var(--bg)]"
                  placeholder="e.g., seedream-4"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Display Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 rounded-lg border border-[var(--line)] bg-[var(--bg)]"
                  placeholder="e.g., SeeDream-4"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Model Path</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                className="w-full p-3 rounded-lg border border-[var(--line)] bg-[var(--bg)]"
                placeholder="e.g., bytedance/seedream-4"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-3 rounded-lg border border-[var(--line)] bg-[var(--bg)]"
                rows={3}
                placeholder="Model description and capabilities"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Max Input Size</label>
                <input
                  type="text"
                  value={formData.maxInputSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxInputSize: e.target.value }))}
                  className="w-full p-3 rounded-lg border border-[var(--line)] bg-[var(--bg)]"
                  placeholder="e.g., 4096x4096"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Output Size</label>
                <input
                  type="text"
                  value={formData.outputSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, outputSize: e.target.value }))}
                  className="w-full p-3 rounded-lg border border-[var(--line)] bg-[var(--bg)]"
                  placeholder="e.g., 4096x4096"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.supportsAspectRatio}
                  onChange={(e) => setFormData(prev => ({ ...prev, supportsAspectRatio: e.target.checked }))}
                  className="rounded"
                />
                Supports Aspect Ratio
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.supportsUpscaling}
                  onChange={(e) => setFormData(prev => ({ ...prev, supportsUpscaling: e.target.checked }))}
                  className="rounded"
                />
                Supports Upscaling
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded"
                />
                Active
              </label>
            </div>

            <div className="flex gap-4">
              <button type="submit" className="btn">
                {editingModel ? "Update Model" : "Add Model"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingModel(null);
                  resetForm();
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Models List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">Loading models...</div>
        ) : (
          models.map((model) => (
            <div
              key={model.id}
              className={`p-6 rounded-xl border transition-all ${
                model.isActive 
                  ? "border-green-500/20 bg-green-500/5" 
                  : "border-[var(--line)] bg-[var(--muted)]"
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{model.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      model.isActive 
                        ? "bg-green-500/20 text-green-400" 
                        : "bg-gray-500/20 text-gray-400"
                    }`}>
                      {model.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm opacity-70 mb-2">{model.model}</p>
                  {model.description && (
                    <p className="text-sm opacity-80">{model.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(model.id)}
                    className={`px-3 py-1 rounded text-sm ${
                      model.isActive 
                        ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" 
                        : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    }`}
                  >
                    {model.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleEdit(model)}
                    className="px-3 py-1 rounded text-sm bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(model.id)}
                    className="px-3 py-1 rounded text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="opacity-70">Max Input</div>
                  <div className="font-mono">{model.maxInputSize}</div>
                </div>
                <div>
                  <div className="opacity-70">Output Size</div>
                  <div className="font-mono">{model.outputSize}</div>
                </div>
                <div>
                  <div className="opacity-70">Features</div>
                  <div className="flex gap-1">
                    {model.supportsAspectRatio && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                        Aspect Ratio
                      </span>
                    )}
                    {model.supportsUpscaling && (
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                        Upscaling
                      </span>
                    )}
                  </div>
                </div>
                {model.scales && model.scales.length > 0 && (
                  <div>
                    <div className="opacity-70">Scales</div>
                    <div className="font-mono">{model.scales.join(", ")}x</div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}

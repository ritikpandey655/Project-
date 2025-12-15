
// This file is deprecated in favor of api/index.py (Python Backend)
// We keep it to avoid file-not-found errors during transition but it does nothing.

export default function handler(req, res) {
  res.status(404).json({ error: "Node.js backend disabled. Use Python backend at /api/..." });
}

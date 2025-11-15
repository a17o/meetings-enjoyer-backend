# Use Python 3.11 slim image (better compatibility with langchain stack)
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for Python packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv package manager
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Add uv to PATH (uv installs to ~/.local/bin by default)
ENV PATH="/root/.local/bin:$PATH"

# Copy dependency files first for better caching
COPY pyproject.toml uv.lock README.md ./

# Install Python dependencies using uv (with system python)
# The ENV PATH is now available for this RUN command
RUN uv sync --frozen --no-dev --python $(which python)

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app

# Switch to appuser
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD .venv/bin/python -c "import requests; requests.get('http://localhost:8080/health')"

# Run the application directly from the virtual environment
CMD [".venv/bin/python", "main.py"] 
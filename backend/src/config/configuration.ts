export default () => ({
  // Server Configuration
  port: parseInt(process.env.PORT || '8080', 10),
  host: process.env.HOST || '0.0.0.0',

  // Database
  database: {
    url: process.env.DATABASE_URL,
  },

  // Frontend URL
  frontend: {
    url: process.env.NEXT_FRONTEND_URL,
  },

  // Backend URL (for OAuth redirects)
  backend: {
    url: process.env.BACKEND_URL,
  },

  // Authentication
  auth: {
    type: process.env.AUTH_TYPE || 'jwt',
    secretKey: process.env.SECRET_KEY || 'your-secret-key-change-in-production',
    registrationEnabled:
      (process.env.REGISTRATION_ENABLED || 'TRUE').toUpperCase() === 'TRUE',
  },

  // Google OAuth
  google: {
    oauth: {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    },
    calendar: {
      redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI,
    },
    gmail: {
      redirectUri: process.env.GOOGLE_GMAIL_REDIRECT_URI,
    },
  },


  // Embedding Configuration
  embedding: {
    model: process.env.EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
    maxSeqLength: parseInt(process.env.EMBEDDING_MAX_SEQ_LENGTH || '512', 10),
    chunkSize: parseInt(process.env.CHUNK_SIZE || '512', 10),
    // Azure OpenAI specific
    azure: {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-10-21',
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
    },
  },

  // Reranker Configuration
  reranker: {
    enabled: (process.env.RERANKERS_ENABLED || 'FALSE').toUpperCase() === 'TRUE',
    modelName: process.env.RERANKERS_MODEL_NAME,
    modelType: process.env.RERANKERS_MODEL_TYPE,
  },

  // ETL Service Configuration
  etl: {
    service: process.env.ETL_SERVICE || 'DOCLING', // UNSTRUCTURED, LLAMACLOUD, or DOCLING
    unstructured: {
      apiKey: process.env.UNSTRUCTURED_API_KEY,
    },
    llamaCloud: {
      apiKey: process.env.LLAMA_CLOUD_API_KEY,
    },
    jinaReader: {
      enabled: (process.env.JINA_READER_ENABLED || 'TRUE').toUpperCase() === 'TRUE',
      apiKey: process.env.JINA_READER_API_KEY || process.env.JINA_API_KEY,
      fallback: {
        enabled:
          (process.env.JINA_READER_FALLBACK_CRAWLEE_ENABLED || 'TRUE').toUpperCase() ===
          'TRUE',
        timeoutMs: parseInt(process.env.CRAWLEE_IMPIT_TIMEOUT_MS || '45000', 10),
        impitBrowser: process.env.CRAWLEE_IMPIT_BROWSER || 'firefox',
        http3: (process.env.CRAWLEE_IMPIT_HTTP3 || 'FALSE').toUpperCase() === 'TRUE',
      },
      proxy: {
        enabled: (process.env.JINA_READER_PROXY_ENABLED || 'FALSE').toUpperCase() === 'TRUE',
        protocol: ((process.env.JINA_READER_PROXY_PROTOCOL || 'http').toLowerCase() === 'https'
          ? 'https'
          : 'http') as 'http' | 'https',
        host: process.env.JINA_READER_PROXY_HOST,
        port: process.env.JINA_READER_PROXY_PORT
          ? parseInt(process.env.JINA_READER_PROXY_PORT, 10)
          : undefined,
        username: process.env.JINA_READER_PROXY_USERNAME,
        password: process.env.JINA_READER_PROXY_PASSWORD,
        checkIpOnEachRequest:
          (process.env.JINA_READER_PROXY_CHECK_IP_ON_EACH_REQUEST || 'FALSE').toUpperCase() ===
          'TRUE',
      },
    },
  },

  // Text-to-Speech Configuration
  tts: {
    service: process.env.TTS_SERVICE, // KOKORO, LITELLM, etc.
    apiBase: process.env.TTS_SERVICE_API_BASE,
    apiKey: process.env.TTS_SERVICE_API_KEY,
  },

  // Speech-to-Text Configuration
  stt: {
    service: process.env.STT_SERVICE, // FASTER_WHISPER, etc.
    apiBase: process.env.STT_SERVICE_API_BASE,
    apiKey: process.env.STT_SERVICE_API_KEY,
  },

  // Task Queue Configuration
  queue: {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
    },
  },

  // LangSmith Observability (optional)
  langsmith: {
    apiKey: process.env.LANGSMITH_API_KEY,
    project: process.env.LANGCHAIN_PROJECT,
    tracingEnabled:
      (process.env.LANGCHAIN_TRACING_V2 || 'FALSE').toUpperCase() === 'TRUE',
  },

  // Connector API Keys
  connectors: {
    github: {
      token: process.env.GITHUB_TOKEN,
    },
    slack: {
      token: process.env.SLACK_TOKEN,
    },
    notion: {
      token: process.env.NOTION_TOKEN,
    },
  },

  // LLM Provider API Keys (for connectors that need them)
  llm: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY,
    },
    cohere: {
      apiKey: process.env.COHERE_API_KEY,
    },
  },
});

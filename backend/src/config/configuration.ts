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

  // Airtable OAuth
  airtable: {
    clientId: process.env.AIRTABLE_CLIENT_ID,
    clientSecret: process.env.AIRTABLE_CLIENT_SECRET,
    redirectUri: process.env.AIRTABLE_REDIRECT_URI,
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
    firecrawl: {
      apiKey: process.env.FIRECRAWL_API_KEY,
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
    linear: {
      apiKey: process.env.LINEAR_API_KEY,
    },
    jira: {
      email: process.env.JIRA_EMAIL,
      apiToken: process.env.JIRA_API_TOKEN,
      serverUrl: process.env.JIRA_SERVER_URL,
    },
    confluence: {
      email: process.env.CONFLUENCE_EMAIL,
      apiToken: process.env.CONFLUENCE_API_TOKEN,
      baseUrl: process.env.CONFLUENCE_BASE_URL,
    },
    discord: {
      token: process.env.DISCORD_TOKEN,
    },
    clickup: {
      apiKey: process.env.CLICKUP_API_KEY,
    },
    luma: {
      apiKey: process.env.LUMA_API_KEY,
    },
    elasticsearch: {
      host: process.env.ELASTICSEARCH_HOST,
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD,
    },
  },

  // Search APIs
  search: {
    tavily: {
      apiKey: process.env.TAVILY_API_KEY,
    },
    linkup: {
      apiKey: process.env.LINKUP_API_KEY,
    },
    searxng: {
      url: process.env.SEARXNG_URL,
    },
    baidu: {
      apiKey: process.env.BAIDU_API_KEY,
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

# Local SEO Generator System Plan

## Executive Summary

**Project Owner:** Jorge Giraldez, CEO of MarketBrewer LLC  
**Primary Client Use Case:** Nash & Smashed Franchising Corp (8 operational + 17 coming soon locations, 21 target keywords)  
**Secondary Client Use Case:** Street Lawyer Magic (~2,956 pages: 45 EN keywords × 45 cities + 20 ES keywords × 45 cities)

**Goal (V1 Redesign):** Build a cost-effective, local-first Local SEO content generation tool that can produce 3,000-10,000 static webpages efficiently using **Ollama only** and exporting **JSON for Webpack ingestion**.

---

## Architecture Overview

### Design Principles
1. **Local-First:** Run Ollama locally to minimize API costs
2. **Two-Laptop Scale (V1):** At least two workers pulling from the same local queue
3. **Batch Processing:** Process content generation in batches, not real-time
4. **Static Output:** Generate JSON files designed for Webpack bundling

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LOCAL SEO GENERATOR SYSTEM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   INPUT      │    │  PROCESSING  │    │   OUTPUT     │                  │
│  │   LAYER      │    │   LAYER      │    │   LAYER      │                  │
│  ├──────────────┤    ├──────────────┤    ├──────────────┤                  │
│  │ - Keywords   │    │ - Local API  │    │ - JSON Files │                  │
│  │ - Locations  │    │ - SQLite     │    │ - Manifest   │                  │
│  │ - Templates  │───▶│ - Job Queue  │───▶│ - Metadata   │                  │
│  │ - Config     │    │ - Generator  │    │              │                  │
│  │              │    │   Generator  │    │              │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         LLM PROVIDER (V1)                            │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │   OLLAMA (Local Only)                                                │   │
│  │   - llama3.2:latest                                                  │   │
│  │   $0/generation                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. Configuration Layer (Local)

```
local-seo-generator/
├── config/
│   ├── local.env                 # Local development config
│   ├── keywords/
│   │   ├── nash-smashed.json     # N&S 21 keywords
│   │   └── street-lawyer.json    # SL 65 keywords (45 EN + 20 ES)
│   ├── locations/
│   │   ├── nash-smashed.json     # N&S 25 locations
│   │   └── street-lawyer.json    # SL 45 cities
│   └── templates/
│       ├── restaurant-seo.txt    # Restaurant content prompts
│       └── legal-seo.txt         # Legal services content prompts
```

V1 uses local environment variables and local config files only.

### 2. Queue Management (Two Options)

#### Option A: Fully Local (SQLite + REST API) — RECOMMENDED FOR V1

```python
# queue/local_queue.py
import sqlite3
from pathlib import Path

class LocalJobQueue:
    """
    Simple SQLite-based job queue for local processing.
    Cost: $0
    """
    def __init__(self, db_path="data/queue.db"):
        self.conn = sqlite3.connect(db_path)
        self._init_tables()
    
    def _init_tables(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                keyword TEXT NOT NULL,
                location TEXT NOT NULL,
                language TEXT DEFAULT 'en',
                status TEXT DEFAULT 'pending',
                priority INTEGER DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                output_path TEXT,
                error_message TEXT
            )
        """)
        self.conn.commit()
    
    def add_job(self, client_id, keyword, location, language='en', priority=5):
        self.conn.execute(
            "INSERT INTO jobs (client_id, keyword, location, language, priority) VALUES (?, ?, ?, ?, ?)",
            (client_id, keyword, location, language, priority)
        )
        self.conn.commit()
    
    def get_next_job(self):
        cursor = self.conn.execute(
            "SELECT * FROM jobs WHERE status='pending' ORDER BY priority DESC, created_at ASC LIMIT 1"
        )
        return cursor.fetchone()
    
    def complete_job(self, job_id, output_path):
        self.conn.execute(
            "UPDATE jobs SET status='completed', completed_at=CURRENT_TIMESTAMP, output_path=? WHERE id=?",
            (output_path, job_id)
        )
        self.conn.commit()
```

#### Option B: AWS SQS (Phase 2)

```python
# queue/sqs_queue.py
import boto3
import json

class SQSJobQueue:
    """
    AWS SQS-based job queue.
    Cost: ~$0.40/million requests (effectively free for 10K pages)
    """
    def __init__(self, queue_url):
        self.sqs = boto3.client('sqs')
        self.queue_url = queue_url
    
    def add_job(self, client_id, keyword, location, language='en', priority=5):
        self.sqs.send_message(
            QueueUrl=self.queue_url,
            MessageBody=json.dumps({
                'client_id': client_id,
                'keyword': keyword,
                'location': location,
                'language': language
            }),
            MessageAttributes={
                'Priority': {
                    'StringValue': str(priority),
                    'DataType': 'Number'
                }
            }
        )
    
    def get_next_job(self):
        response = self.sqs.receive_message(
            QueueUrl=self.queue_url,
            MaxNumberOfMessages=1,
            WaitTimeSeconds=20
        )
        if 'Messages' in response:
            return response['Messages'][0]
        return None
```

**Cost Comparison:**
| Solution | Setup | Per 10K Jobs | Best For |
|----------|-------|--------------|----------|
| SQLite (Local) | $0 | $0 | Personal use, single machine |
| AWS SQS | $0 | ~$0.004 | Cloud deployment, multi-worker |

**Recommendation:** Use **SQLite locally** since this is a personal tool. Add SQS support for future cloud scaling.

### 3. LLM Integration (Ollama Only)

V1 keeps the interface surface small:
- `OllamaClient.generate(prompt, options)`
- No cloud routing or fallback
    def _generate_ollama(self, prompt: str, max_tokens: int) -> str:
        """Generate using local Ollama."""
        response = requests.post(
            f"{self.ollama_url}/api/generate",
            json={
                "model": self.ollama_model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "num_predict": max_tokens
                }
            },
            timeout=120
        )
        response.raise_for_status()
        return response.json()['response']
    
    def _generate_claude(self, prompt: str, max_tokens: int) -> str:
        """Generate using Claude API."""
        client = Anthropic(api_key=self.anthropic_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text
    
    def _generate_openai(self, prompt: str, max_tokens: int) -> str:
        """Generate using OpenAI API."""
        client = OpenAI(api_key=self.openai_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens
        )
        return response.choices[0].message.content
```

### 4. Content Generator (Landing Pages)

```python
# generators/seo_content.py
import json
from datetime import datetime
from typing import Dict, Any
from .llm_router import LLMRouter

class LocalSEOContentGenerator:
    """Generates Local SEO landing pages for V1."""
    
    def __init__(self, llm_router: LLMRouter, template_path: str):
        self.llm = llm_router
        self.template = self._load_template(template_path)
    
    def _load_template(self, path: str) -> str:
        with open(path, 'r') as f:
            return f.read()
    
    def generate_landing_page(
        self, 
        business_info: Dict[str, Any],
        keyword_or_service: str, 
        city_state: str, 
        language: str = 'en'
    ) -> Dict[str, Any]:
        """
        Generate a complete blog post with SEO metadata.
        """
        # Build prompt from template
        prompt = self._build_prompt(business_info, keyword_or_service, city_state, language)
        
        # Generate content
        raw_content = self.llm.generate_content(prompt)
        
        # Parse and structure the response
        return self._structure_content(
            raw_content, 
            business_info,
            keyword_or_service, 
            city_state, 
            language
        )
    
    def _build_prompt(
        self, 
        business_info: Dict[str, Any],
        keyword_or_service: str, 
        city_state: str, 
        language: str
    ) -> str:
        """Build the generation prompt."""
        return self.template.format(
            business_name=business_info['name'],
            business_phone=business_info['phone'],
            business_address=business_info.get('address', ''),
            primary_keyword=keyword_or_service,
            target_location=city_state,
            language=language,
            practice_areas=', '.join(business_info.get('services', [])),
            cta_text=business_info.get('cta', 'Contact us today!')
        )
    
    def _structure_content(
        self,
        raw_content: str,
        business_info: Dict[str, Any],
        keyword_or_service: str,
        city_state: str,
        language: str
    ) -> Dict[str, Any]:
        """Structure generated content into a landing page JSON format."""
        slug = self._generate_slug(keyword_or_service, city_state)
        
        return {
            "slug": slug,
            "title": self._extract_title(raw_content, keyword_or_service, city_state),
            "keywordOrService": keyword_or_service,
            "cityState": city_state,
            "language": language,
            "content": raw_content,
            "meta_description": self._generate_meta_description(raw_content, keyword_or_service, city_state),
            "created_at": datetime.now().isoformat(),
            "business_id": business_info.get('id', 'unknown'),
            "schema": self._generate_schema(business_info, keyword_or_service, city_state)
        }
    
    def _generate_slug(self, keyword_or_service: str, city_state: str) -> str:
        """Generate URL-safe slug."""
        keyword_slug = keyword_or_service.lower().replace(' ', '-')
        location_slug = city_state.lower().replace(' ', '-').replace(',', '')
        return f"{keyword_slug}/{location_slug}"
    
    def _extract_title(self, content: str, keyword_or_service: str, city_state: str) -> str:
        """Extract or generate page title."""
        # Try to find H1 in content, otherwise generate
        lines = content.split('\n')
        for line in lines:
            if line.startswith('# '):
                return line[2:].strip()
        return f"{keyword_or_service.title()} in {city_state}"
    
    def _generate_meta_description(self, content: str, keyword_or_service: str, city_state: str) -> str:
        """Generate meta description (max 160 chars)."""
        # Take first meaningful paragraph
        paragraphs = [p for p in content.split('\n\n') if len(p) > 50 and not p.startswith('#')]
        if paragraphs:
            desc = paragraphs[0][:157] + '...' if len(paragraphs[0]) > 160 else paragraphs[0]
            return desc
        return f"Find {keyword_or_service} in {city_state}. Contact us today for expert service."
    
    def _generate_schema(self, business_info: Dict[str, Any], keyword_or_service: str, city_state: str) -> Dict:
        """Generate JSON-LD schema markup."""
        return {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": business_info['name'],
            "telephone": business_info.get('phone', ''),
            "address": {
                "@type": "PostalAddress",
                "addressLocality": city_state
            },
            "areaServed": city_state,
            "description": f"{keyword_or_service} services in {city_state}"
        }
```

### 5. Output Layer (JSON + Webpack Manifest)

```python
# output/exporter.py
import json
import os
from pathlib import Path
from typing import Dict, Any, List
from jinja2 import Environment, FileSystemLoader

class StaticExporter:
    """
    Exports generated content to JSON files.
    Also writes a manifest/index for predictable Webpack ingestion.
    """
    
    def __init__(self, output_dir: str, html_template_dir: str = None):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Setup Jinja2 for HTML generation
        if html_template_dir:
            self.jinja_env = Environment(
                loader=FileSystemLoader(html_template_dir)
            )
    
    def export_page(self, page: Dict[str, Any], client_id: str) -> str:
        """Export single landing page to JSON."""
        # Create client directory
        client_dir = self.output_dir / client_id / "pages"
        client_dir.mkdir(parents=True, exist_ok=True)
        
        # Export JSON
        json_path = client_dir / f"{page['slug'].replace('/', '_')}.json"
        with open(json_path, 'w') as f:
            json.dump(page, f, indent=2)
        
        return str(json_path)
    
    def export_batch(self, pages: List[Dict[str, Any]], client_id: str) -> Dict[str, Any]:
        """Export batch of pages and generate a manifest index."""
        exported = []
        
        for page in pages:
            path = self.export_page(page, client_id)
            exported.append({
                "slug": page['slug'],
                "title": page['title'],
                "path": path
            })
        
        # Generate master index
        index_path = self.output_dir / client_id / "pages_manifest.json"
        with open(index_path, 'w') as f:
            json.dump({
                "total_pages": len(exported),
                "generated_at": datetime.now().isoformat(),
                "pages": exported
            }, f, indent=2)
        
        return {
            "total": len(exported),
            "index_path": str(index_path)
        }
    
Sitemaps can be a later addition once URL routing is finalized.

### Webpack Ingestion Strategy (V1)

Avoid Vite-only features like `import.meta.glob`. Recommended Webpack patterns:

1) **`require.context` + manifest** (simple, scalable)

```ts
// Example: load a page JSON from a slug
// pages live under: src/data/seo-pages/

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pagesContext = require.context('./data/seo-pages', false, /\.json$/);

export function loadSeoPageJson(fileName: string) {
    // fileName example: "criminal-defense_washington-dc.json"
    return pagesContext(`./${fileName}`);
}
```

2) **Codegen index module** (maximum explicit control)
- Exporter writes `index.ts` with explicit imports and a slug map.
- Most verbose, but avoids context modules.
```

---

## Project Structure

```
local-seo-generator/
├── README.md
├── requirements.txt
├── setup.py
│
├── config/
│   ├── local.env.example        # Template for local environment
│   ├── clients/
│   │   ├── nash-smashed.json    # N&S configuration
│   │   └── street-lawyer.json   # Street Lawyer configuration
│   └── templates/
│       ├── restaurant-seo.txt   # Restaurant industry prompts
│       └── legal-seo.txt        # Legal industry prompts
│
├── src/
│   ├── __init__.py
│   ├── cli.py                   # Command-line interface
│   ├── queue/
│   │   ├── __init__.py
│   │   ├── base.py              # Abstract queue interface
│   │   ├── local_queue.py       # SQLite implementation
│   │   └── sqs_queue.py         # AWS SQS implementation
│   ├── llm/
│   │   ├── __init__.py
│   │   ├── router.py            # LLM provider router
│   │   └── prompts.py           # Prompt templates
│   ├── generators/
│   │   ├── __init__.py
│   │   └── seo_content.py       # Content generator
│   ├── output/
│   │   ├── __init__.py
│   │   ├── exporter.py          # JSON/HTML exporter
│   │   └── sitemap.py           # Sitemap generator
│   └── utils/
│       ├── __init__.py
│       └── config_loader.py     # Config & secrets loader
│
├── data/                        # Local data directory
│   ├── queue.db                 # SQLite job queue
│   └── output/                  # Generated content
│       ├── nash-smashed/
│       └── street-lawyer/
│
├── scripts/
│   ├── seed_jobs.py             # Seed job queue with all combos
│   ├── process_queue.py         # Worker to process queue
│   └── export_to_webpack.py     # Export to webpack project
│
└── tests/
    ├── test_llm_router.py
    ├── test_generator.py
    └── test_exporter.py
```

---

## Workflow for 3,000-10,000 Pages

### Phase 1: Setup & Seeding

```bash
# 1. Install Ollama locally
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2:8b

# 2. Setup project
git clone https://github.com/marketbrewer/local-seo-generator.git
cd local-seo-generator
pip install -r requirements.txt

# 3. Configure client
cp config/clients/template.json config/clients/nash-smashed.json
# Edit with N&S locations and keywords

# 4. Seed job queue
python scripts/seed_jobs.py --client nash-smashed
# Creates 525 jobs (21 keywords × 25 locations)
```

### Phase 2: Batch Processing

```bash
# Process all jobs locally (Ollama)
python scripts/process_queue.py --client nash-smashed --workers 4

# Or process specific tier
python scripts/process_queue.py --client nash-smashed --tier 1 --workers 2
```

**Processing Time Estimates (Ollama on M2 Mac):**
| Model | Pages/Hour | 500 Pages | 3,000 Pages | 10,000 Pages |
|-------|------------|-----------|-------------|--------------|
| Llama 3.2 8B | ~30 | 16 hrs | 100 hrs | 333 hrs |
| Llama 3.2 8B (4 workers) | ~100 | 5 hrs | 30 hrs | 100 hrs |
| Mistral 7B | ~40 | 12 hrs | 75 hrs | 250 hrs |
| Claude Haiku (API) | ~300 | 1.5 hrs | 10 hrs | 33 hrs |

### Phase 3: Export to Webpack Project

```bash
# Export to Nash & Smashed website
python scripts/export_to_webpack.py \
  --client nash-smashed \
  --output ../nash-and-smashed-website/src/data/blog/

# Export sitemap
python scripts/export_to_webpack.py \
  --client nash-smashed \
  --sitemap \
  --base-url https://nashandsmashed.com \
  --output ../nash-and-smashed-website/public/
```

---

## Cost Analysis

### Scenario: 10,000 Pages

| Component | Local (Ollama) | Cloud (Claude Haiku) | Hybrid |
|-----------|----------------|---------------------|--------|
| LLM Generation | $0 | ~$30 | ~$5 |
| AWS SQS | $0 | ~$0.004 | $0 |
| AWS Parameter Store | $0 | $0 | $0 |
| DynamoDB | $0 | N/A | $0 |
| Total | **$0** | **~$30** | **~$5** |

**Hybrid Approach:** Use Ollama for 90% of content, Claude for quality-critical pages (Tier 1 locations).

---

## Integration with Existing Projects

### Nash & Smashed Website

```javascript
// src/data/blog/loader.js
import blogIndex from './blog_index.json';

export const loadBlogPost = async (slug) => {
  const post = blogIndex.posts.find(p => p.slug === slug);
  if (!post) return null;
  
  const module = await import(`./${post.slug.replace('/', '_')}.json`);
  return module.default;
};

// src/routes.tsx - Add dynamic route
<Route path="/blog/:keyword/:location" element={<LocalSEOBlogPage />} />
```

### Street Lawyer Magic Website

```javascript
// Same pattern, different content
// Already has Java 21 Lambda backend, but blog content is static
// Generated JSON imports directly into webpack build
```

---

## CLI Commands Reference

```bash
# Initialize new client
seo-gen init --client my-restaurant

# Add keywords
seo-gen keywords add --client my-restaurant --file keywords.csv

# Add locations  
seo-gen locations add --client my-restaurant --file locations.csv

# Seed queue
seo-gen queue seed --client my-restaurant

# Process queue
seo-gen process --client my-restaurant --workers 4

# Check status
seo-gen status --client my-restaurant

# Export content
seo-gen export --client my-restaurant --format json --output ./output/

# Generate sitemap
seo-gen sitemap --client my-restaurant --base-url https://example.com
```

---

## Next Steps

1. **Week 1:** Build core CLI and queue system
2. **Week 2:** Implement Ollama integration and content generator
3. **Week 3:** Build export system and test with small batch
4. **Week 4:** Generate Tier 1 content for Nash & Smashed
5. **Week 5:** Full generation and webpack integration

---

## Questions to Resolve

1. **Ollama Model Selection:** Which model gives best quality/speed tradeoff?
   - Recommend testing: Llama 3.2 8B, Mistral 7B, Qwen 2.5 7B

2. **Content Quality:** Do you want human review for Tier 1 pages?

3. **Multi-language:** Spanish content for Street Lawyer - should use different model/prompts?

4. **Incremental Updates:** How often will keywords/locations change?

---

*Document prepared for Jorge Giraldez, MarketBrewer LLC*  
*Generated: December 2025*

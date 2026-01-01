# Extending: Creating New Content Types

This project is designed to be easily extensible. You can create new content generators for any daily posting use case.

## Architecture Overview

The system uses a plugin-based architecture:

```
ContentGenerator (interface)
    ↓
BaseContentGenerator (abstract class)
    ↓
YearProgressGenerator (concrete implementation)
HoroscopeGenerator (your new generator)
QuoteGenerator (your new generator)
```

## Creating a New Content Generator

### Step 1: Create Your Generator

Create a new file in `src/generators/`:

```typescript
// src/generators/your-generator.ts
import type { StateData } from '../types/index.js';
import { BaseContentGenerator } from './base-generator.js';
import { getRandomText, getHashtags } from '../utils/asset-picker.js';

export class YourGenerator extends BaseContentGenerator {
  readonly contentType = 'your-content-type';

  // Your data
  private data: YourDataType;

  constructor() {
    super();
    this.data = this.fetchData();
  }

  private fetchData(): YourDataType {
    // Fetch or calculate your data
    return { /* ... */ };
  }

  protected getText(): string {
    // Return the text to display in the video
    return getRandomText('yourContentType', {
      variable1: this.data.value1,
      variable2: this.data.value2,
    });
  }

  protected getPercent(): number {
    // Return a value 0-100 for the progress bar
    // Or return a constant if not applicable
    return 50;
  }

  protected getHashtags(): string[] {
    return getHashtags('yourContentType');
  }

  getCurrentIdentifier(): string | number {
    // Return a unique identifier for today's content
    // Used to prevent duplicate posts
    return `${this.data.id}_${new Date().toISOString().split('T')[0]}`;
  }

  async shouldGenerate(lastState: StateData | null): Promise<boolean> {
    if (!lastState) return true;
    if (lastState.contentType !== this.contentType) return true;
    
    // Your logic for when to generate new content
    return lastState.lastValue !== this.getCurrentIdentifier();
  }

  protected getAdditionalMetadata(): Record<string, unknown> {
    return {
      // Any extra data to store
      customField: this.data.customField,
    };
  }
}
```

### Step 2: Add Text Templates

Update `config/texts.json`:

```json
{
  "yearProgress": { ... },
  "yourContentType": {
    "templates": [
      "Template with {variable1} and {variable2}",
      "Another template: {variable1}"
    ],
    "hashtags": [
      "#yourtag",
      "#anothertag"
    ]
  }
}
```

### Step 3: Update Main Entry Point

Modify `src/index.ts` to use your generator:

```typescript
import { YourGenerator } from './generators/your-generator.js';

// In main():
const contentType = config.app.contentType;

let generator: ContentGenerator;
if (contentType === 'your-content-type') {
  generator = new YourGenerator();
} else {
  generator = new YearProgressGenerator();
}
```

### Step 4: Configure Environment

Update `.env`:
```
CONTENT_TYPE=your-content-type
```

---

## Example: Daily Horoscope Generator

See `src/generators/horoscope-generator.example.ts` for a complete example of a horoscope generator.

To use it:
1. Rename `horoscope-generator.example.ts` to `horoscope-generator.ts`
2. Implement the `fetchHoroscope()` method with your API
3. Add horoscope templates to `config/texts.json`
4. Set `CONTENT_TYPE=horoscope` in `.env`

---

## Example: Quote of the Day Generator

```typescript
export class QuoteGenerator extends BaseContentGenerator {
  readonly contentType = 'quote';
  
  private quote: { text: string; author: string };

  constructor() {
    super();
    this.quote = { text: '', author: '' };
  }

  async generate(): ReturnType<BaseContentGenerator['generate']> {
    // Fetch quote before generating
    this.quote = await this.fetchQuote();
    return super.generate();
  }

  private async fetchQuote(): Promise<{ text: string; author: string }> {
    // Use an API like:
    // - https://api.quotable.io/random
    // - https://zenquotes.io/api/random
    const response = await fetch('https://api.quotable.io/random');
    const data = await response.json();
    return { text: data.content, author: data.author };
  }

  protected getText(): string {
    return `"${this.quote.text}"\n\n— ${this.quote.author}`;
  }

  protected getPercent(): number {
    // Random visual element
    return Math.floor(Math.random() * 100);
  }

  getCurrentIdentifier(): string {
    return new Date().toISOString().split('T')[0];
  }

  // ... etc
}
```

---

## Tips

1. **Test locally first**: Use `npm run dry-run` to test without posting
2. **Handle errors gracefully**: Implement retry logic for API calls
3. **Cache when possible**: Store API responses if they don't change often
4. **Add tests**: Create tests in `tests/generators/your-generator.test.ts`
5. **Update documentation**: Document your generator's requirements

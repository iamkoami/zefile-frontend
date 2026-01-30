# OG Image Creation Guide

## Required: Create og-image.png

Social platforms (Facebook, Twitter, LinkedIn) require a **PNG image** for Open Graph previews.

### Specifications

| Property | Value |
|----------|-------|
| **Dimensions** | 1200 x 630 pixels |
| **Format** | PNG (preferred) or JPEG |
| **File size** | Under 8MB (ideally under 1MB) |
| **Safe zone** | Keep important content within center 1080x560px |

### Design Guidelines

Use these brand elements:

- **Background**: #FDFAF4 (light beige) or #FFFFFF (white)
- **Primary accent**: #5E53E0 (purple)
- **Secondary accent**: #87E64B (green)
- **Text color**: #171717 (dark)
- **Font**: Metropolis or system sans-serif

### Content to Include

1. **ZeFile logo** - Prominent, centered
2. **Tagline**: "Secure File Transfer with Payment Protection"
3. **Value prop**: "Free up to 2GB • Encrypted • Get Paid Before Download"
4. **Visual**: Consider adding a simple illustration of file transfer or lock icon

### Creating the Image

#### Option 1: Convert from SVG (Quick)
```bash
# Using ImageMagick
convert og-image.svg og-image.png

# Or using Inkscape
inkscape og-image.svg --export-type=png --export-filename=og-image.png --export-width=1200 --export-height=630
```

#### Option 2: Use Figma/Canva (Recommended)
1. Create a 1200x630px canvas
2. Design using brand guidelines above
3. Export as PNG

#### Option 3: Use an OG Image Generator
- [OG Image Generator](https://og-playground.vercel.app/)
- [Vercel OG](https://vercel.com/docs/functions/og-image-generation)

### After Creating

1. Save as `public/og-image.png`
2. Delete this README file
3. Test with:
   - [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - [Twitter Card Validator](https://cards-dev.twitter.com/validator)
   - [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

### Creating Locale-Specific Images (Optional)

For better engagement in French markets, create:
- `public/og-image-fr.png` with French text

Then update `layout.tsx` to use locale-specific images.

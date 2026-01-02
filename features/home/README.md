# Home Feature

This feature implements the ZeFile home page based on the Figma wireframe design.

## Components

### Header
- **Location**: `features/home/components/Header.tsx`
- **Features**:
  - Logo (Ze File)
  - Main navigation menu: Centre d'aide, Comment ça marche, Annonceurs, À propos
  - Connection menu: Se connecter, S'inscrire
  - Hover state: neutral 200 grey background (#E5E5E5), 8px border radius
  - Simple vertical line separator between main menu and connection menu
  - Primary button (S'inscrire): green background (#22C55E), 4px border radius

### UploadPanel
- **Location**: `features/home/components/UploadPanel.tsx`
- **Features**:
  - Drag and drop zone for file uploads
  - Click to select files
  - Plus icon with border
  - "Ajouter des éléments" title with "Jusqu'à 2GB" limit
  - Helper text
  - File counter when files are selected
  - Transfer button (green #86EFAC)
  - Options button (three dots) to show/hide TransferOptionsPanel

### TransferOptionsPanel
- **Location**: `features/home/components/TransferOptionsPanel.tsx`
- **Features**:
  - Visible only when options button is clicked
  - Four form fields:
    - Contrôle d'accès (dropdown)
    - Durée de validité (dropdown)
    - Limite de la taille d'envoie (dropdown)
    - Définir un mot de passe (text input)
  - White background, rounded corners (16px)
  - Focus state: green ring (#22C55E)

## Layout

### Page Structure
- **Background**: Grey (#ECF0F4), 16px border radius
- **Two-panel layout**:
  - Upload panel (left/top)
  - Options panel (right/bottom, conditionally visible)
- **Responsive**: Stacks vertically on mobile, side-by-side on desktop

## Design Specifications

### Colors
- **Background**: #ECF0F4 (light grey)
- **White panels**: #FFFFFF
- **Primary green**: #22C55E (buttons)
- **Light green**: #86EFAC (transfer button)
- **Neutral 200**: #E5E5E5 (hover states)
- **Border**: #D1D5DB (grey 300)
- **Text**: #111827 (grey 900)

### Border Radius
- **Header hover**: 8px
- **Buttons**: 4px
- **Page content**: 16px
- **Panels**: 16px

### Typography
- **Font**: Metropolis (to be added)
- **Fallback**: system-ui, arial
- **Weights used**:
  - Regular (400): body text
  - Medium (500): emphasized text
  - SemiBold (600): headings
  - Bold (700): strong emphasis

## Font Installation

To add the Metropolis font:

1. Place the following files in `/public/fonts/metropolis/`:
   - `Metropolis-Regular.woff2`
   - `Metropolis-Medium.woff2`
   - `Metropolis-SemiBold.woff2`
   - `Metropolis-Bold.woff2`

2. Uncomment the font configuration in `/app/layout.tsx`

3. Update the body className to include the Metropolis variable

## Usage

```tsx
import Home from './app/page';

// The home page automatically includes all components
// and handles the options panel visibility state
```

## State Management

Currently uses React's built-in `useState` for:
- Menu hover states (Header)
- Options panel visibility (Home page)
- File selection (UploadPanel)
- Form inputs (TransferOptionsPanel)

For production, consider integrating with:
- File upload API from backend
- Transfer creation endpoint
- Form validation
- Error handling
- Loading states

## Next Steps

1. Add Metropolis font files
2. Connect to backend API for file uploads
3. Implement file upload progress tracking
4. Add form validation
5. Add error handling and user feedback
6. Implement actual file transfer functionality
7. Add authentication integration
8. Connect navigation menu to actual routes

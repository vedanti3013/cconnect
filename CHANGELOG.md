# Changelog

## [1.0.0] - 2026-03-02

### Major Features

#### 🎨 Complete Theme System Implementation
- **New Theme Architecture**: Created comprehensive light/dark theme system using React Context API
  - `mobile/src/config/theme.js` - Dual-theme color palettes with 18+ semantic colors
  - `mobile/src/context/ThemeContext.js` - Global theme state management with persistence
  - Theme colors include: primary, secondary, accent, danger, success, warning, info, text, background, surface, border, shadow
  
- **Dark Mode Toggle**: Added dark mode switch in Profile → Preferences
  - Instant color switching across entire app
  - Theme preference persists to device storage
  - Moon/Sun icon indicator

#### 🔄 Theme Integration Across Screens
All major screens now feature full theme support with dynamic colors:

- **DashboardScreen**
  - Header, search bar, stat cards, quick actions with theme colors
  - Dark mode-aware urgent card backgrounds
  - Enhanced shadows (elevation 5, opacity 0.15) for depth perception
  - Dynamic primary colors for badges and buttons

- **ProfileScreen**
  - User profile header with theme surface
  - All menu items and sections theme-aware
  - Dark mode toggle switch with track colors
  - Account, preferences, and admin sections with proper color contrast

- **EventsScreen**
  - Filter buttons adapt to theme (dark gray in dark mode)
  - Event cards with theme surfaces and shadows
  - Date badges using primary color
  - Status badge colors maintained
  - Calendar button uses theme primary

- **FeedScreen**
  - Post cards with dynamic backgrounds (dark-aware urgent backgrounds)
  - Filter chips with conditional styling
  - Author info and text colors theme-based
  - Event date containers with theme borders and backgrounds

- **PollsScreen**
  - Poll cards with theme surfaces
  - **Fixed Option Styling**: Poll option buttons now use theme-aware backgrounds instead of bright white blocks
    - Selected options: subtle tinted indigo (#1E3A8A33 dark / #EEF2FF light)
    - Unselected options: neutral surfaces (#273449 dark / #F8FAFC light)
    - Text remains readable in both themes
  - Filter buttons with conditional backgrounds
  - Status badges with proper theme colors

- **UserDetailScreen**
  - User profile headers with theme surfaces
  - Post cards with theme backgrounds
  - Avatar backgrounds using primary color
  - Department badges with theme-aware styling

- **CalendarScreen**
  - Added theme hook ready for calendar styling integration

#### 🎯 Backend Filter Enhancements
- Added `is_event` parameter support to POST `/api/posts` endpoint
- Added `created_by` parameter support to GET `/api/events` endpoint
- These enable precise filtering for accurate user-scoped counts

### Bug Fixes

#### Profile Stats Accuracy
- **Problem**: Dashboard showed inflated post/event counts mixing all users' content
- **Solution**: 
  - Backend now filters posts by `is_event=false` for regular posts
  - Backend now filters events by `created_by` for personal events
  - Profile fetches pagination totals instead of list lengths
  - Accurate separation between regular posts and event-posts

#### Dashboard/Events Visibility
- **Problem**: Campus-wide upcoming events were missing from Dashboard and Events screens
- **Cause**: Strict `is_event=true` filtering excluded older event-posts without the flag
- **Solution**: Reverted to fetch all posts and detect events by `event_date` presence
  - Dashboard fetches `limit: 200` posts, filters by `event_date` for campus-wide visibility
  - Events screen maintains the same approach for consistent behavior
  - Profile personal stats remain scoped to user via backend filters

#### Poll Option Text Visibility (Dark Mode)
- **Problem**: In dark mode, white poll option blocks made text invisible
- **Solution**:
  - Changed option backgrounds from hardcoded white to theme-aware conditionals
  - Selected options: subtle tinted blue (readable with primary color text)
  - Unselected options: neutral gray (readable with standard text color)
  - Progress bars use theme primary with opacity for unselected options

### Shadow Enhancements
Increased shadow depth across cards for better visual hierarchy:
- statCard: elevation 5, shadowOpacity 0.15 (was 2, 0.08)
- eventCard: elevation 4, shadowOpacity 0.12 (was 2, 0.08)
- searchResultCard: elevation 3, shadowOpacity 0.12 (was 1, 0.08)
- postCard: elevation varies by state with enhanced opacity

### Files Changed

#### New Files
- `mobile/src/config/theme.js` - Theme palette definitions
- `mobile/src/context/ThemeContext.js` - Theme state management
- `mobile/src/screens/UserDetailScreen.js` - User profile with personal posts
- `backend/src/config/localStorage.js` - Local storage configuration

#### Modified Files
**Frontend (Mobile)**
- `mobile/App.js` - Added ThemeProvider wrapper
- `mobile/src/navigation/AppNavigator.js` - Added UserDetail screen routing
- `mobile/src/config/constants.js` - Enhanced color palette constants
- `mobile/src/screens/DashboardScreen.js` - Full theme integration
- `mobile/src/screens/ProfileScreen.js` - Full theme integration + dark mode toggle
- `mobile/src/screens/EventsScreen.js` - Theme integration + campus-wide event fetch
- `mobile/src/screens/FeedScreen.js` - Theme integration + post styling
- `mobile/src/screens/PollsScreen.js` - Theme integration + option styling fixes
- `mobile/src/screens/CalendarScreen.js` - Theme hook added
- `mobile/src/screens/PostDetailScreen.js` - Theme support
- `mobile/src/screens/RegisterScreen.js` - Theme support
- `mobile/src/screens/CreatePostScreen.js` - Theme support
- `mobile/src/services/api.js` - API improvements

**Backend (Server)**
- `backend/src/controllers/post.controller.js` - Added `is_event` filter support
- `backend/src/controllers/event.controller.js` - Added `created_by` filter support
- Other controllers: Minor improvements for consistency

### Technical Details

#### Theme System Architecture
```javascript
// Usage in any screen
const { theme, isDarkMode, toggleTheme } = useTheme();

// Apply theme colors
<View style={{ backgroundColor: theme.background }}>
  <Text style={{ color: theme.text }}>Content</Text>
</View>

// Dark mode conditionals
backgroundColor: isDarkMode ? '#7F1D1D' : '#FEF2F2'
```

#### Color Palettes
**Light Theme**
- Primary: #6366F1 (Indigo)
- Background: #FFFFFF
- Surface: #FFFFFF
- Text: #1F2937
- TextSecondary: #6B7280

**Dark Theme**
- Primary: #818CF8 (Light Indigo)
- Background: #0F172A
- Surface: #1E293B
- Text: #F1F5F9
- TextSecondary: #94A3B8

### Performance
- Theme preference cached locally (no network calls)
- Context-based theme prevents unnecessary re-renders
- All screens optimized with dynamic styling
- Vote/post/event counts use pagination totals (efficient)

### Compatibility
- React Native compatible
- Expo web support verified
- Dark mode respects system preferences on initial load
- Graceful fallback to light theme if no preference stored

### Breaking Changes
None - this release maintains backward compatibility with existing API endpoints.

### Known Limitations
- CalendarScreen styling pending completion
- Some create/detail screens can use additional theme refinement
- Analytics screen not yet themed (secondary priority)

### Testing Recommendations
1. ✅ Toggle dark mode and verify colors across all screens
2. ✅ Check profile personal counts vs. dashboard campus-wide counts
3. ✅ Verify poll options are readable in both themes
4. ✅ Test upcoming events visibility in dashboard and events list
5. ✅ Confirm shadow depth improves at evening/low-light viewing

### Future Enhancements
- [ ] Custom theme color picker for users
- [ ] High contrast mode for accessibility
- [ ] Per-screen theme overrides
- [ ] Animated theme transitions
- [ ] Theme export/import functionality

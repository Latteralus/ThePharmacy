# Electron Rewrite Plan (Archived, Never Implemented)

> **Status: historical / not current.** This document describes a planned TypeScript + React + Redux + Webpack rewrite of the game, sketched out across two files (`structure.txt`, dated 3/7/2025, and this one) early in the project's life. **None of it was ever built.** The codebase today is still the original architecture: plain JavaScript files loaded as `<script>` tags off the `window` global, no bundler, no framework, no TypeScript. See `Changelog.md` for what the project actually is right now.
>
> Kept for reference in case this direction gets picked up again later — otherwise safe to ignore or delete.

---

## Part 1 — Early structure sketch (originally `structure.txt`, 3/7/2025)

This was an early draft of what a rewritten project layout might look like, written before the plan below was fleshed out. It also does not match the current repo (e.g. it assumes a `PharmaSim` root folder, a `src/` split, and Electron Forge — the real project uses electron-builder and a flat root layout).

```
/PharmaSim
├── package.json             # Electron app configuration and dependencies
├── main.js                 # Electron main process entry point
├── preload.js              # Preload script for renderer process
├── LICENSE                 # Project licensing information
├── README.md               # Project overview and documentation
├── INSTALL.md              # Installation instructions

## Source Code Directories
├── src/                    # Main source code directory
│   ├── renderer/           # Renderer process (frontend) code
│   │   ├── index.html      # Main HTML entry point
│   │   ├── styles/         # CSS stylesheets
│   │   │   └── main.css
│   │   └── js/             # Frontend JavaScript files
│   │       ├── main.js
│   │       ├── ui.js
│   │       └── ... (other frontend scripts)
│   │
│   ├── main/               # Main game logic
│   │   ├── js/             # Game logic JavaScript files
│   │   │   ├── gameLogic.js
│   │   │   ├── timeEvents.js
│   │   │   ├── taskManager.js
│   │   │   └── ... (other game logic scripts)
│   │   │
│   │   └── data/           # Game data and configuration
│   │       ├── names.js
│   │       ├── products.js
│   │       └── ... (other data files)
│   │
│   └── assets/             # Static assets
│       ├── images/
│       ├── icons/
│       └── fonts/

## Build and Distribution
├── build/                  # Build output directory
│   ├── win/                # Windows build
│   ├── mac/                # macOS build
│   └── linux/              # Linux build

## Development Tools
├── scripts/                # Build and development scripts
│   ├── build.js
│   ├── dev.js
│   └── package.js

## Configuration and Docs
├── docs/                   # Documentation
│   ├── README.md
│   ├── INSTALL.md
│   └── CHANGELOG.md

## Testing
├── tests/                  # Unit and integration tests
│   ├── main/
│   └── renderer/

## Node Modules
├── node_modules/           # npm dependencies

## Electron Packaging
├── forge.config.js         # Electron Forge configuration
└── .gitignore
```

**Recent updates (as of 3/7/2025):**
- Migrated from browser-based to Electron desktop application
- Added multi-platform build support
- Restructured project for Electron architecture
- Updated build and packaging scripts
- Enhanced installation and documentation

**Upcoming features (as of 3/7/2025):**
- Electron auto-update implementation
- Cross-platform build optimizations
- Enhanced logging and error reporting
- Performance improvements for desktop environment

---

## Part 2 — Full transformation plan (originally `revision.md`)

This document outlines a comprehensive plan to transform PharmaSim from its current web-based implementation to a robust Electron desktop application, while preserving all existing gameplay elements.

### Phase 1: Architecture Foundation (4 weeks)

**Week 1: Project Setup & Module System**
- [ ] Create a new Electron project structure
- [ ] Set up TypeScript configuration
- [ ] Configure Webpack for bundling
- [ ] Establish folder structure for new architecture
- [ ] Create ModuleRegistry system for dependency management
- [ ] Define IPC communication patterns between main and renderer processes

**Week 2: Core State Management**
- [ ] Implement Redux store architecture
- [ ] Create reducers for key game systems (finances, inventory, employees, etc.)
- [ ] Develop action creators for game events
- [ ] Set up middleware for side effects (thunks or sagas)
- [ ] Implement selectors for accessing game state
- [ ] Create persistence layer for saving/loading game state

**Week 3: Game Loop & Simulation Engine**
- [ ] Develop main process simulation engine
- [ ] Create event-based game loop decoupled from UI
- [ ] Implement time scaling and controls
- [ ] Migrate core simulation logic from current codebase
- [ ] Set up event emission system for game state changes
- [ ] Create debugging tools for simulation monitoring

**Week 4: UI Framework Foundation**
- [ ] Set up React and component structure
- [ ] Create basic layout components (topbar, sidebar, main content)
- [ ] Implement theme system
- [ ] Develop UI state management
- [ ] Create component library for common UI elements
- [ ] Build responsive container system

### Phase 2: Feature Migration (8 weeks)

**Week 5: Core Game Systems**
- [ ] Migrate financial system to new architecture
- [ ] Implement inventory and material management
- [ ] Rebuild employee management system
- [ ] Develop customer flow logic
- [ ] Create task management system
- [ ] Set up game initialization and configuration

**Week 6: Primary UI Components**
- [ ] Develop operations page with real-time updates
- [ ] Create inventory management interface
- [ ] Build employee management screens
- [ ] Implement financial reports and dashboards
- [ ] Develop marketplace and purchasing interface
- [ ] Create equipment management screen

**Week 7: Task & Customer Systems**
- [ ] Implement task assignment system
- [ ] Develop customer generation and management
- [ ] Create prescription handling workflow
- [ ] Build insurance claim processing
- [ ] Implement task progress visualization
- [ ] Develop customer satisfaction metrics

**Week 8: Production & Research Systems**
- [ ] Migrate production system to new architecture
- [ ] Implement production queuing and management
- [ ] Create research and development interface
- [ ] Build product formulation system
- [ ] Implement equipment usage and maintenance
- [ ] Develop supplier relationships

**Week 9: Financial & Analytics**
- [ ] Create detailed financial reporting
- [ ] Implement profit and loss tracking
- [ ] Develop cash flow management
- [ ] Build sales analytics
- [ ] Create expense tracking
- [ ] Implement financial projections

**Week 10: Save/Load & Game Management**
- [ ] Develop robust save/load system using Electron's file system
- [ ] Implement autosave functionality
- [ ] Create game configuration options
- [ ] Build new game setup flow
- [ ] Implement difficulty settings
- [ ] Create game state migration for updates

**Week 11: Polishing Game Mechanics**
- [ ] Refine game balance
- [ ] Improve employee efficiency calculations
- [ ] Enhance customer patience system
- [ ] Optimize task assignment logic
- [ ] Refine financial formulas
- [ ] Improve product pricing strategies

**Week 12: Testing & Feedback Loop**
- [ ] Implement comprehensive testing of game systems
- [ ] Create automated tests for core logic
- [ ] Set up test scenarios for game progression
- [ ] Validate balance across difficulty levels
- [ ] Test save/load functionality
- [ ] Verify cross-platform compatibility

### Phase 3: Enhancement & Optimization (4 weeks)

**Week 13: Performance Optimization**
- [ ] Profile application performance
- [ ] Optimize render performance
- [ ] Improve simulation efficiency
- [ ] Reduce memory usage
- [ ] Optimize startup time
- [ ] Implement resource cleanup

**Week 14: User Experience Enhancements**
- [ ] Add animations and transitions
- [ ] Plan for audio integration (future feature)
- [ ] Create improved tutorial system
- [ ] Develop tooltips and help system
- [ ] Enhance notifications
- [ ] Improve accessibility

**Week 15: Advanced Features**
- [ ] Implement data export/import
- [ ] Create scenario editor
- [ ] Improve configuration options
- [ ] Develop achievements system
- [ ] Build statistics and history tracking
- [ ] Improve local save management

**Week 16: Packaging & Distribution**
- [ ] Configure electron-builder for application packaging
- [ ] Set up auto-update mechanism
- [ ] Create installers for all platforms
- [ ] Implement license management
- [ ] Prepare store listings
- [ ] Build update distribution system

### Implementation Details

#### Core Architectural Changes

**Module System** — replace global window properties with proper imports/exports:

```js
// Before
window.finances = { ... }
window.updateUI("finances");

// After
import { updateUI } from '../ui/uiManager';
import FinanceManager from './financeManager';

const financeManager = new FinanceManager();
export default financeManager;

// When needed
updateUI('finances');
```

**State Management** — implement Redux for central state management:

```js
// Redux store structure
{
  simulation: {
    currentDate: Date,
    timeScale: number,
    isPaused: boolean
  },
  finances: {
    cash: number,
    transactions: [],
    // ...other financial data
  },
  inventory: {
    products: [],
    materials: []
  },
  employees: {
    list: [],
    assignments: {}
  },
  customers: {
    active: [],
    history: []
  },
  tasks: {
    pending: [],
    inProgress: [],
    completed: []
  }
}
```

**IPC Communication** — use Electron's IPC for process communication:

```js
// In main process
ipcMain.handle('simulation:advance', (event, minutes) => {
  return gameSimulation.advanceTime(minutes);
});

// In renderer
const advanceSimulation = async (minutes) => {
  const newState = await ipcRenderer.invoke('simulation:advance', minutes);
  dispatch(updateSimulationState(newState));
};
```

#### UI Component Structure

```
/components
  /core
    Layout.jsx
    TopBar.jsx
    SideBar.jsx
    MainContent.jsx
  /finances
    FinancesDashboard.jsx
    TransactionList.jsx
    RevenueChart.jsx
  /inventory
    InventoryList.jsx
    ProductCard.jsx
    MaterialCard.jsx
  /employees
    EmployeeList.jsx
    EmployeeCard.jsx
    AssignmentManager.jsx
  /customers
    CustomerList.jsx
    CustomerCard.jsx
    PrescriptionManager.jsx
  /tasks
    TaskList.jsx
    TaskCard.jsx
    TaskAssignment.jsx
  /ui
    Button.jsx
    Card.jsx
    Modal.jsx
    ProgressBar.jsx
    Notifications.jsx
```

#### Data Flow Architecture

1. User interaction triggers an action
2. Action is dispatched to Redux store
3. For complex operations, thunk middleware sends request to main process
4. Main process performs simulation calculations
5. Results are returned to renderer process
6. UI updates based on new state

### Migration Strategy

Rather than starting from scratch, the migration would follow these guidelines:

1. Extract core game logic from existing code
2. Adapt it to the new architecture
3. Create new UI components that match existing functionality
4. Develop feature parity tests to ensure gameplay remains intact
5. Gradually replace old systems with new implementations

### Testing & Quality Assurance

- Implement Jest for unit testing core game logic
- Use React Testing Library for component tests
- Create Spectron tests for full application testing
- Develop scenario-based tests for gameplay validation
- Implement save compatibility tests
- Add performance benchmarks

### Risks & Contingencies

| Risk | Mitigation |
|------|------------|
| Feature regression | Comprehensive test suite comparing old and new implementations |
| Performance issues | Regular profiling and performance testing throughout development |
| Save compatibility | Create migration utilities for existing save files |
| Scope creep | Strict adherence to feature parity before adding enhancements |
| Technical debt | Code reviews and architectural oversight |

### Definition of Done

A feature would be considered complete when:
1. It matches or exceeds the functionality of the current implementation
2. It passes all tests
3. It integrates with the new architecture
4. It has been reviewed and approved
5. It performs at least as well as the current implementation

### Proposed Naming Convention and File Structure

**General naming conventions:**

- **File Names**: kebab-case (e.g., `game-state.ts`, `employee-service.ts`)
- **Component Names**: PascalCase (e.g., `EmployeeList.tsx`, `InventoryPanel.tsx`)
- **Class Names**: PascalCase (e.g., `GameSimulation`, `EmployeeManager`)
- **Interface Names**: PascalCase with `I` prefix (e.g., `IEmployeeData`, `IGameState`)
- **Type Names**: PascalCase with `T` prefix (e.g., `TEmployeeRole`, `TInventoryItem`)
- **Enum Names**: PascalCase (e.g., `EmployeeRole`, `GameDifficulty`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_EMPLOYEES`, `DEFAULT_CAPITAL`)
- **Functions**: camelCase (e.g., `calculateProfit()`, `handleEmployeeHire()`)
- **Variables**: camelCase (e.g., `employeeList`, `currentInventory`)
- **Redux Actions**: UPPER_SNAKE_CASE (e.g., `HIRE_EMPLOYEE`, `UPDATE_INVENTORY`)
- **Redux Action Creators**: camelCase with descriptive verbs (e.g., `hireEmployee()`, `updateInventory()`)
- **Redux Reducers**: camelCase with `Reducer` suffix (e.g., `employeeReducer`, `inventoryReducer`)
- **Redux Selectors**: camelCase with `select` prefix (e.g., `selectAllEmployees`, `selectInventoryItems`)

**Proposed directory structure:**

```
thepharmacy/
├── node_modules/
├── package.json
├── package-lock.json
├── tsconfig.json
├── webpack.config.js
├── .gitignore
├── README.md
├── src/
│   ├── main/                      # Main process code
│   │   ├── index.ts               # Main entry point
│   │   ├── preload.ts             # Preload script
│   │   ├── types/                 # Type definitions
│   │   │   ├── game-state.ts      # Game state interface
│   │   │   ├── employee.ts        # Employee interfaces
│   │   │   └── ...
│   │   ├── simulation/            # Core simulation engine
│   │   │   ├── game-loop.ts       # Game timing and loop
│   │   │   ├── time-manager.ts    # Game time progression
│   │   │   └── simulation-engine.ts # Main simulation controller
│   │   ├── services/              # Main process services
│   │   │   ├── file-service.ts    # File I/O operations
│   │   │   ├── save-service.ts    # Game save/load functionality
│   │   │   ├── config-service.ts  # Configuration management
│   │   │   ├── ipc-service.ts     # IPC communication handler
│   │   │   └── logger-service.ts  # Logging functionality
│   │   └── utils/                 # Utility functions
│   │       ├── path-utils.ts      # Path manipulation utilities
│   │       └── error-handler.ts   # Error handling utilities
│   │
│   └── renderer/                  # Renderer process code
│       ├── index.tsx              # Renderer entry point
│       ├── App.tsx                # Main React component
│       ├── index.html             # HTML template
│       ├── types/                 # Type definitions for renderer
│       │   ├── ui-state.ts        # UI state interfaces
│       │   └── ...
│       ├── store/                 # Redux store
│       │   ├── index.ts           # Store configuration
│       │   ├── actions/           # Redux actions
│       │   ├── reducers/          # Redux reducers
│       │   ├── thunks/            # Redux Thunk middleware functions
│       │   └── selectors/         # Redux selectors
│       ├── components/            # React components (core, finances, employees, inventory, ui)
│       ├── pages/                 # Page components
│       │   ├── DashboardPage.tsx
│       │   ├── OperationsPage.tsx
│       │   ├── FinancesPage.tsx
│       │   └── ...
│       ├── hooks/                 # Custom React hooks
│       ├── utils/                 # Utility functions
│       ├── api/                   # IPC client for renderer
│       └── styles/                # CSS/SCSS styles
├── assets/                        # Static assets
├── build/                         # Build configuration
├── dist/                          # Distribution packages
└── tests/                         # Tests (unit, integration, e2e)
```

**Specific file naming map for files that existed at the time of writing:**

| Current file | Proposed new location |
|-------------|-------------------|
| electron-main.js | src/main/index.ts |
| preload.js | src/main/preload.ts |
| game-integration.js | src/main/services/game-service.ts |
| electron-integration.js | src/renderer/api/electron-bridge.ts |
| index.html | src/renderer/index.html |
| main.html | src/renderer/game.html (initially) → later refactored into React components |
| settings.html | src/renderer/settings.html (initially) → later refactored to SettingsPage.tsx |

### Data Models and Interfaces (proposed)

**Game State:** `IGameState`, `IFinancesData`, `IEmployeesData`, `IInventoryData`

**Employees:** `IEmployee`, `IPharmacist`, `ITechnician`, `TEmployeeRole`

**Inventory:** `IProduct`, `IMaterial`, `IEquipment`

**Operations:** `ITask`, `IPrescription`, `IOrder`

**Customers:** `ICustomer`, `IInsurance`

**Redux slices:** `gameSlice`, `employeesSlice`, `inventorySlice`, `financesSlice`, `customersSlice`, `uiSlice`

**Example action types:** `EMPLOYEES/HIRE_EMPLOYEE`, `EMPLOYEES/FIRE_EMPLOYEE`, `INVENTORY/ADD_ITEM`, `FINANCES/RECORD_TRANSACTION`

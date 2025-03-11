# PharmaSim Electron Transformation Plan

This document outlines a comprehensive plan to transform PharmaSim from its current web-based implementation to a robust Electron desktop application, while preserving all existing gameplay elements.

## Phase 1: Architecture Foundation (4 weeks)

### Week 1: Project Setup & Module System
- [ ] Create a new Electron project structure
- [ ] Set up TypeScript configuration
- [ ] Configure Webpack for bundling
- [ ] Establish folder structure for new architecture
- [ ] Create ModuleRegistry system for dependency management
- [ ] Define IPC communication patterns between main and renderer processes

### Week 2: Core State Management
- [ ] Implement Redux store architecture
- [ ] Create reducers for key game systems (finances, inventory, employees, etc.)
- [ ] Develop action creators for game events
- [ ] Set up middleware for side effects (thunks or sagas)
- [ ] Implement selectors for accessing game state
- [ ] Create persistence layer for saving/loading game state

### Week 3: Game Loop & Simulation Engine
- [ ] Develop main process simulation engine
- [ ] Create event-based game loop decoupled from UI
- [ ] Implement time scaling and controls
- [ ] Migrate core simulation logic from current codebase
- [ ] Set up event emission system for game state changes
- [ ] Create debugging tools for simulation monitoring

### Week 4: UI Framework Foundation
- [ ] Set up React and component structure
- [ ] Create basic layout components (topbar, sidebar, main content)
- [ ] Implement theme system
- [ ] Develop UI state management
- [ ] Create component library for common UI elements
- [ ] Build responsive container system

## Phase 2: Feature Migration (8 weeks)

### Week 5: Core Game Systems
- [ ] Migrate financial system to new architecture
- [ ] Implement inventory and material management
- [ ] Rebuild employee management system
- [ ] Develop customer flow logic
- [ ] Create task management system
- [ ] Set up game initialization and configuration

### Week 6: Primary UI Components
- [ ] Develop operations page with real-time updates
- [ ] Create inventory management interface
- [ ] Build employee management screens
- [ ] Implement financial reports and dashboards
- [ ] Develop marketplace and purchasing interface
- [ ] Create equipment management screen

### Week 7: Task & Customer Systems
- [ ] Implement task assignment system
- [ ] Develop customer generation and management
- [ ] Create prescription handling workflow
- [ ] Build insurance claim processing
- [ ] Implement task progress visualization
- [ ] Develop customer satisfaction metrics

### Week 8: Production & Research Systems
- [ ] Migrate production system to new architecture
- [ ] Implement production queuing and management
- [ ] Create research and development interface
- [ ] Build product formulation system
- [ ] Implement equipment usage and maintenance
- [ ] Develop supplier relationships

### Week 9: Financial & Analytics
- [ ] Create detailed financial reporting
- [ ] Implement profit and loss tracking
- [ ] Develop cash flow management
- [ ] Build sales analytics
- [ ] Create expense tracking
- [ ] Implement financial projections

### Week 10: Save/Load & Game Management
- [ ] Develop robust save/load system using Electron's file system
- [ ] Implement autosave functionality
- [ ] Create game configuration options
- [ ] Build new game setup flow
- [ ] Implement difficulty settings
- [ ] Create game state migration for updates

### Week 11: Polishing Game Mechanics
- [ ] Refine game balance
- [ ] Improve employee efficiency calculations
- [ ] Enhance customer patience system
- [ ] Optimize task assignment logic
- [ ] Refine financial formulas
- [ ] Improve product pricing strategies

### Week 12: Testing & Feedback Loop
- [ ] Implement comprehensive testing of game systems
- [ ] Create automated tests for core logic
- [ ] Set up test scenarios for game progression
- [ ] Validate balance across difficulty levels
- [ ] Test save/load functionality
- [ ] Verify cross-platform compatibility

## Phase 3: Enhancement & Optimization (4 weeks)

### Week 13: Performance Optimization
- [ ] Profile application performance
- [ ] Optimize render performance
- [ ] Improve simulation efficiency
- [ ] Reduce memory usage
- [ ] Optimize startup time
- [ ] Implement resource cleanup

### Week 14: User Experience Enhancements
- [ ] Add animations and transitions
- [ ] Plan for audio integration (future feature)
- [ ] Create improved tutorial system
- [ ] Develop tooltips and help system
- [ ] Enhance notifications
- [ ] Improve accessibility

### Week 15: Advanced Features
- [ ] Implement data export/import
- [ ] Create scenario editor
- [ ] Improve configuration options
- [ ] Develop achievements system
- [ ] Build statistics and history tracking
- [ ] Improve local save management

### Week 16: Packaging & Distribution
- [ ] Configure electron-builder for application packaging
- [ ] Set up auto-update mechanism
- [ ] Create installers for all platforms
- [ ] Implement license management
- [ ] Prepare store listings
- [ ] Build update distribution system

## Implementation Details

### Core Architectural Changes

#### Module System
Replace global window properties with proper imports/exports:

```
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

#### State Management
Implement Redux for central state management:

```
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

#### IPC Communication
Use Electron's IPC for process communication:

```
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

### UI Component Structure

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

### Data Flow Architecture

1. User interaction triggers an action
2. Action is dispatched to Redux store
3. For complex operations, thunk middleware sends request to main process
4. Main process performs simulation calculations
5. Results are returned to renderer process
6. UI updates based on new state

## Migration Strategy

Rather than starting from scratch, the migration will follow these guidelines:

1. Extract core game logic from existing code
2. Adapt it to the new architecture
3. Create new UI components that match existing functionality
4. Develop feature parity tests to ensure gameplay remains intact
5. Gradually replace old systems with new implementations

## Testing & Quality Assurance

- Implement Jest for unit testing core game logic
- Use React Testing Library for component tests
- Create Spectron tests for full application testing
- Develop scenario-based tests for gameplay validation
- Implement save compatibility tests
- Add performance benchmarks

## Risks & Contingencies

| Risk | Mitigation |
|------|------------|
| Feature regression | Comprehensive test suite comparing old and new implementations |
| Performance issues | Regular profiling and performance testing throughout development |
| Save compatibility | Create migration utilities for existing save files |
| Scope creep | Strict adherence to feature parity before adding enhancements |
| Technical debt | Code reviews and architectural oversight |

## Definition of Done

A feature is considered complete when:
1. It matches or exceeds the functionality of the current implementation
2. It passes all tests
3. It integrates with the new architecture
4. It has been reviewed and approved
5. It performs at least as well as the current implementation

This transformation plan focuses on preserving the core gameplay experience while significantly improving the technical foundation, maintainability, and user experience of PharmaSim as a native Electron application.

## Proposed File Structure
# PharmaSim Naming Convention and File Structure

## General Naming Conventions

- **File Names**: Use kebab-case for file names (e.g., `game-state.ts`, `employee-service.ts`)
- **Component Names**: Use PascalCase for React components and their files (e.g., `EmployeeList.tsx`, `InventoryPanel.tsx`)
- **Class Names**: Use PascalCase for classes (e.g., `GameSimulation`, `EmployeeManager`)
- **Interface Names**: Use PascalCase with 'I' prefix (e.g., `IEmployeeData`, `IGameState`)
- **Type Names**: Use PascalCase with 'T' prefix for complex types (e.g., `TEmployeeRole`, `TInventoryItem`)
- **Enum Names**: Use PascalCase (e.g., `EmployeeRole`, `GameDifficulty`)
- **Constants**: Use UPPER_SNAKE_CASE for constants (e.g., `MAX_EMPLOYEES`, `DEFAULT_CAPITAL`)
- **Functions**: Use camelCase for functions (e.g., `calculateProfit()`, `handleEmployeeHire()`)
- **Variables**: Use camelCase for variables (e.g., `employeeList`, `currentInventory`)
- **Redux Actions**: Use UPPER_SNAKE_CASE for action types (e.g., `HIRE_EMPLOYEE`, `UPDATE_INVENTORY`)
- **Redux Action Creators**: Use camelCase with descriptive verbs (e.g., `hireEmployee()`, `updateInventory()`)
- **Redux Reducers**: Use camelCase with 'Reducer' suffix (e.g., `employeeReducer`, `inventoryReducer`)
- **Redux Selectors**: Use camelCase with 'select' prefix (e.g., `selectAllEmployees`, `selectInventoryItems`)

## Directory Structure

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
│       │   │   ├── employee-actions.ts
│       │   │   ├── inventory-actions.ts
│       │   │   └── ...
│       │   ├── reducers/          # Redux reducers
│       │   │   ├── employee-reducer.ts
│       │   │   ├── inventory-reducer.ts
│       │   │   └── ...
│       │   ├── thunks/            # Redux Thunk middleware functions
│       │   │   ├── finance-thunks.ts
│       │   │   └── ...
│       │   └── selectors/         # Redux selectors
│       │       ├── employee-selectors.ts
│       │       ├── inventory-selectors.ts
│       │       └── ...
│       ├── components/            # React components
│       │   ├── core/              # Core UI components
│       │   │   ├── Layout.tsx
│       │   │   ├── TopBar.tsx
│       │   │   ├── SideBar.tsx
│       │   │   └── ...
│       │   ├── finances/          # Finance-related components
│       │   │   ├── FinancesDashboard.tsx
│       │   │   ├── TransactionList.tsx
│       │   │   └── ...
│       │   ├── employees/         # Employee-related components
│       │   │   ├── EmployeeList.tsx
│       │   │   ├── EmployeeCard.tsx
│       │   │   └── ...
│       │   ├── inventory/         # Inventory-related components
│       │   │   ├── InventoryList.tsx
│       │   │   ├── ProductCard.tsx
│       │   │   └── ...
│       │   └── ui/                # General UI components
│       │       ├── Button.tsx
│       │       ├── Card.tsx
│       │       ├── ProgressBar.tsx
│       │       └── ...
│       ├── pages/                 # Page components
│       │   ├── DashboardPage.tsx
│       │   ├── OperationsPage.tsx
│       │   ├── FinancesPage.tsx
│       │   └── ...
│       ├── hooks/                 # Custom React hooks
│       │   ├── useGameTime.ts
│       │   ├── useEmployees.ts
│       │   └── ...
│       ├── utils/                 # Utility functions
│       │   ├── formatters.ts
│       │   ├── calculations.ts
│       │   └── ...
│       ├── api/                   # IPC client for renderer
│       │   ├── finances.ts
│       │   ├── employees.ts
│       │   └── ...
│       └── styles/                # CSS/SCSS styles
│           ├── global.scss
│           ├── theme.ts
│           └── components/
│               ├── button.scss
│               └── ...
├── assets/                        # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
├── build/                         # Build configuration
│   ├── webpack.main.config.js
│   └── webpack.renderer.config.js
├── dist/                          # Distribution packages
└── tests/                         # Tests
    ├── unit/
    ├── integration/
    └── e2e/
```

## Specific File Naming Map for Current Files

| Current File | New File Location | 
|-------------|-------------------|
| electron-main.js | src/main/index.ts |
| preload.js | src/main/preload.ts |
| game-integration.js | src/main/services/game-service.ts |
| electron-integration.js | src/renderer/api/electron-bridge.ts |
| index.html | src/renderer/index.html |
| main.html | src/renderer/game.html (initially) → Later refactored into React components |
| settings.html | src/renderer/settings.html (initially) → Later refactored to SettingsPage.tsx |

## Data Models and Interfaces

### Game State
- `IGameState` - Main game state interface
- `IFinancesData` - Financial data structure
- `IEmployeesData` - Employee data structure
- `IInventoryData` - Inventory data structure

### Employees
- `IEmployee` - Base employee interface
- `IPharmacist` - Pharmacist-specific interface
- `ITechnician` - Technician-specific interface
- `TEmployeeRole` - Employee role type (enum)

### Inventory
- `IProduct` - Product interface
- `IMaterial` - Raw material interface
- `IEquipment` - Equipment interface

### Operations
- `ITask` - Task interface
- `IPrescription` - Prescription interface
- `IOrder` - Order interface

### Customers
- `ICustomer` - Customer interface
- `IInsurance` - Insurance interface

## Redux Structure

### Slices
- `gameSlice` - Game simulation state
- `employeesSlice` - Employee management
- `inventorySlice` - Inventory management
- `financesSlice` - Financial management
- `customersSlice` - Customer management
- `uiSlice` - UI state management

### Action Types (example)
- `EMPLOYEES/HIRE_EMPLOYEE`
- `EMPLOYEES/FIRE_EMPLOYEE`
- `INVENTORY/ADD_ITEM`
- `FINANCES/RECORD_TRANSACTION`

This naming convention and file structure provides a clear, consistent framework that will scale with the project and prevent the need for renaming later.
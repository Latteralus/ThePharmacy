// Staff (data/employees.ts): skills, hours and overtime, morale.
//
// Ambient typings for the window globals: every file is a classic
// <script> (no modules), and each module adds its own fields to Window.

interface EmployeeSkills {
    compounding: number;
    dispensing: number;
    customerService: number;
    inventoryManagement: number;
    sales: number;
}

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    salary: number;
    skills: EmployeeSkills;
    morale: number;
    // Game minutes spent on tasks since the day opened. employees.endOfDay
    // turns it into rest or overwork, then resets it. Missing in saves from
    // before Phase 7 (read as 0).
    minutesWorkedToday?: number;
    // This week's game minutes on tasks (Sunday to Saturday), and the part
    // of them that wasn't daily overtime (at most 8 hours a day). Past 40
    // straight hours is weekly overtime (finances.overtimeSplit). Reset at
    // the Sunday rollover (employees.startNewDay). Missing before Phase 9.
    minutesWorkedThisWeek?: number;
    straightMinutesThisWeek?: number;
    // Sent home: not given work until this dayIndex (the next opening).
    offUntilDay?: number;
    // "Don't allow overtime": at 8 hours today or 40 straight this week they
    // take no new task, finish the one they're on, then go home.
    noOvertime?: boolean;
    // dayIndex the player was last told they went into overtime (once a day)
    overtimeNotifiedDay?: number;
    // The three static starting employees use an ISO date string; employees
    // hired at runtime (hireEmployee's candidates) get a real Date instead.
    hireDate: string | Date;
    currentTaskId: string | null;
}

// One employee's day, from employees.endOfDay (shown in the daily summary).
interface StaffDayReport {
    id: string;
    name: string;
    role: string;
    hoursWorked: number;
    moraleBefore: number;
    moraleAfter: number;
    // What moved their morale, in player words ("overworked (11.5h)")
    reasons: string[];
    quit: boolean;
    // Overtime hours paid at this closing (daily and weekly)
    overtimeHours: number;
}

// Where an employee stands against the overtime rule (Phase 9, #7):
// approaching from 7 hours today or 36 straight this week.
type OvertimeStatus = 'none' | 'approaching' | 'overtime';

interface EmployeesApi {
    // The last closing time's report (empty until the first one).
    lastDayReport: StaffDayReport[];
    getEmployeeById: (employeeId: string) => Employee | undefined;
    getEmployeeFullName: (employee: Employee) => string;
    // The skill (0-100) a task uses.
    taskSkill: (employee: Employee, task: Task) => number;
    // Game minutes of work done per game minute on this task (1 = normal).
    workRate: (employee: Employee, task: Task) => number;
    updateEmployeeMorale: (employeeId: string, moraleChange: number) => void;
    // Salary against helpers.fairSalary: 0.1 is 10% over the market rate.
    payVsMarket: (employee: Employee) => number;
    // Closing time: morale from today's hours and pay; very unhappy staff may quit.
    endOfDay: () => StaffDayReport[];
    // False for a salary that isn't above $0.
    setSalary: (employeeId: string, salary: number) => boolean;
    hireEmployee: (role: string, skillLevel: string) => void;
    hireSelectedEmployee: (employeeData: Employee) => void;
    fireEmployee: (employeeId: string) => void;
    // Fired or quit. False if there's no such employee.
    removeEmployee: (employeeId: string) => boolean;

    // Hours and overtime (Phase 9, #7)
    // Counts game minutes spent on a task (taskManager.updateTasks).
    recordWork: (employee: Employee, minutes: number) => void;
    overtimeStatus: (employee: Employee) => OvertimeStatus;
    // At 8 hours today or 40 straight this week ("Don't allow overtime")
    atOvertimeLimit: (employee: Employee) => boolean;
    isSentHome: (employee: Employee) => boolean;
    // Finishing a task at their overtime limit, then going home
    isGoingHome: (employee: Employee) => boolean;
    // Not sent home and not held back at their overtime limit
    canTakeWork: (employee: Employee) => boolean;
    // Their task goes back in the queue with its progress; off until the
    // next opening. `auto`: their overtime limit, not the player.
    sendHome: (employeeId: string, auto?: boolean) => boolean;
    // Undoes sendHome, the same day.
    callBack: (employeeId: string) => boolean;
    setNoOvertime: (employeeId: string, on: boolean) => void;
    // Anyone idle at their "Don't allow overtime" limit goes home.
    sendHomeAtLimit: () => void;
    // The morning: weekly hours reset on Sunday.
    startNewDay: (date: Date) => void;
    // What the staff can't do, for the Employees page and the Dashboard
    // (no pharmacist, no one to fill or compound).
    staffingWarnings: () => string[];
}

interface Window {
    employeesData: Employee[];
    employees: EmployeesApi;
    // Owned by employeesPage.js, not converted yet, but called unconditionally
    // by employees.ts's hireEmployee (no typeof guard in the original either)
    // — required for the same reason as showPage/ui/taskManager above.
    displayEmployeeCandidates: (candidates: Employee[]) => void;
}

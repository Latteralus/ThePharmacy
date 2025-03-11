Concept Overview:

Create a text-based browser simulation game called The Pharmacy that operates in real-time by default but allows the player to adjust the speed to 1x, 3x, 5x, or 12x or pause the game entirely. The player manages a realistic compounding pharmacy business, starting small and expanding over time by making strategic decisions. The game emphasizes a modular design with data stored in external, easily modifiable files. This allows for flexibility in adjusting game balance, adding content, and expanding features without significant code changes to the core game logic or UI. The player character can personally perform tasks, develop skills, and improve stats to influence productivity. The game focuses on general time management (e.g., shifts and days), realistic financial systems, and detailed business mechanics, with a strong emphasis on depth and detail.

Key Features and Mechanics

1. Player Character Mechanics

Player Tasks:
The player character can perform tasks directly, including:
Filling prescriptions (now including various dosage forms).
Interacting with customers (including counseling).
Managing online sales (if tools are purchased).
Tasks take time to complete, and the player's efficiency improves as they level up related skills.
Skill Progression:
The player character has stats (e.g., Speed, Accuracy, Customer Service, Sales, Compounding) that improve with use or training.
Skill progression should influence task completion speed, quality, and success rate (especially for compounding).
Data Source:
Initial player stats, skills, and progression curves are defined in a dedicated player.js module.
2. On-Demand Tasks

Order-Driven Workflow:
All production tasks are initiated on demand after customers place orders or prescriptions are received.
Orders:
Are queued and displayed in the Production Page, including:
Prescriptions to be filled (with dosage form specified).
Items to be packaged and shipped (for online orders).
Task Management System:
Create a Production Page in the UI where tasks are listed:
Each task includes details like the type of prescription/order, specified dosage form, assigned employee, and estimated time to completion.
Include a visual progress bar for each task that fills as the task is worked on.
Include an employee mood icon to indicate employee morale (e.g., 😀, 😐, 💤, ☹️, 😡).
Player Interaction with Tasks:
The player can manually assign themselves to tasks to assist with production or handle tasks when there are no employees available.
Employees automatically pick up tasks unless stopped, in which case a warning should be displayed (e.g., missing materials or supplies).
Data Source:
Task types, durations, and rewards are defined in a dedicated tasks.js module.
3. Employee Mood System

Mood Icons and Meaning:
😀 Green Smiley Face: Happy, working efficiently.
😐 Yellow Neutral Face: Content but not motivated.
💤 Sleepy Face: Tired, needs a break.
☹️ Unhappy Face: Dissatisfied, morale is low.
😡 Mad/Furious Face: Upset, productivity is severely impacted.
Mood Management:
Morale affects task speed, quality, and error rate.
Players can boost morale through breaks, raises, benefits, or improved working conditions.
Employee data, including initial stats, roles, and salary, is defined in employees.js.
4. Compounding Mechanics

Ingredient Interactions:
Introduce a system where combining certain ingredients can have positive, negative, or neutral effects on the final product's efficacy and safety.
Data on ingredient interactions is stored in products.js or a dedicated interactions.js file.
Dosage Forms:
Players can create different dosage forms, including:
Capsules
Tablets
Creams
Ointments
Injectables
Liquids
Suppositories
Patches
Each dosage form has specific production requirements, equipment needs, and costs.
Dosage form data is stored in products.js or a dedicated dosageForms.js file.
Equipment:
Introduce various pieces of compounding equipment:
Mortar and Pestle
Capsule Filling Machine
Ointment Mill
Tablet Press
Sterile Hood (for injectables)
Electronic Balance
Hot Plate Stirrer
Refrigerator/Freezer
Homogenizer
Equipment affects compounding speed, efficiency, and the types of dosage forms that can be created.
Equipment data (cost, efficiency, maintenance) is stored in equipment.js.
Compounding Skill:
A specific "Compounding" skill governs the player's ability to successfully compound medications, affecting success rate, quality, and speed.
5. Customer Interactions

Customer Types:
Define different customer types with unique behaviors and preferences:
Regulars: Loyal customers who visit frequently.
New: First-time customers.
Picky: Customers who are very particular about their medications or service.
Rushed: Customers who are in a hurry.
Uninformed: Customers who need more counseling and guidance.
Elderly: May require assistance or have specific medication needs.
Parents: Purchasing medication for children, may have additional questions or concerns.
Customer type data is stored in customers.js.
Insurance:
Implement a basic insurance system:
Customers may have different insurance plans with varying copays, formularies (lists of covered drugs), and coverage rules.
The player needs to verify insurance and process claims.
Insurance plan data is stored in insurance.js.
Counseling:
Players can counsel customers on their medications, providing information on dosage, side effects, and interactions.
Successful counseling improves customer satisfaction and reputation.
Counseling topics and effectiveness data could be stored in customers.js or a separate counseling.js file.
6. Reputation System

Dynamic Reputation:
The pharmacy's reputation fluctuates based on:
Customer satisfaction (influenced by wait times, order accuracy, employee interactions, counseling, and pricing).
Order fulfillment speed and efficiency.
Product quality (especially for compounded medications).
Ethical choices (e.g., not overpricing essential medications).
Marketing and advertising efforts.
Reputation is tracked as a numerical value (e.g., 0-100) and can have different tiers (e.g., "Excellent," "Good," "Fair," "Poor," "Disreputable").
Consequences:
Reputation affects:
Customer traffic (higher reputation attracts more customers).
Wholesale prices (better reputation may lead to discounts from suppliers).
Employee morale and hiring pool (talented employees may be attracted to reputable pharmacies).
Loan interest rates (banks may offer better terms to reputable businesses).
Regulatory scrutiny (a poor reputation might attract more frequent inspections).
7. Company and Player Setup

Company Creation: Name the company (with options for generating random names) and set a "Based out of" location (purely cosmetic).
Player Creation: Enter first name, last name (or use random names from names.js), gender, and age.
UI Design and Pages

Dashboard:
Overview of business operations, player character stats, and key performance indicators (KPIs) like daily/weekly/monthly revenue, customer satisfaction, and reputation.
Marketplace:
Buy and sell raw materials and products with dynamic pricing. Prices and product availability are driven by data in products.js and potentially market.js (if you implement market fluctuations).
Production:
Task queue with progress bars, employee assignments, and morale indicators. This page also handles compounding tasks, showing required ingredients, equipment, and dosage forms.
Inventory:
Manage raw materials, finished products, and incoming shipments. Inventory data is managed in inventory.js. Includes dosage form tracking and equipment management.
Financials:
Track profit/loss, cash flow, and loans. Financial data and calculations are managed in finances.js.
Employees:
Roster, morale tracking, training options, and employee stats. Employee management is handled in employees.js.
Orders:
View active and historical customer orders. Orders are generated and managed in orders.js.
Achievements & Stats:
Lifetime business milestones and overall performance.
Settings:
Game speed, audio, save/load options, and resets.
R&D (Phase 4):
Manage proprietary drug development and research, including investment, research progress, and clinical trials (simplified system).
Marketing (Phase 4):
Set campaign budgets, choose target demographics (using customers.js data), and track campaign effectiveness (impact on customer traffic and reputation).
CSR (Phase 5):
Improve reputation through charitable activities (e.g., donating medications, sponsoring health awareness events).
Notifications:
Alerts for critical issues (e.g., low morale, inventory shortages, drug recalls, customer complaints, expiring ingredients).
Data Structure and Modularization

Data Files (js/data/):
names.js: Contains arrays of first names and last names for random name generation.
products.js: Contains an array of product objects, including:
id
name
baseCost
description
type (e.g., "over-the-counter," "prescription")
ingredients (array of ingredient IDs and quantities for compounded products)
dosageForms (array of dosage forms the product can be made into)
interactions (data on interactions with other ingredients or products)
equipment.js: Contains an array of equipment objects, including:
id
name
cost
efficiency
maintenance (cost, frequency)
dosageForms (array of dosage forms that can be made with this equipment)
dosageForms.js Contains an array of dosage form objects, including:
id
name
description
productionRequirements
customers.js: Contains data on customer types, including:
type (e.g., "Regular," "New," "Picky," "Rushed")
preferences (e.g., preferred dosage forms, brands)
patienceLevel
counselingNeeds (e.g., high, medium, low)
insurance.js: Contains data on insurance plans, including:
planName
copays (for different drug types or tiers)
formulary (list of covered drugs)
coverageRules
Modules (js/modules/):
player.js: Manages player data, stats, skills, and actions.
inventory.js: Handles inventory management, including adding, removing, tracking items, and managing different dosage forms.
finances.js: Manages financial data, calculations, and transactions.
employees.js: Handles employee data, hiring, firing, mood management, and task assignment.
tasks.js: Defines task types, durations, rewards, and manages the task queue.
orders.js: Generates and manages customer orders, including order creation, processing, tracking, and handling insurance claims.
reputation.js: Tracks and manages the pharmacy's reputation, including calculations based on various factors and consequences.
(Potentially more modules as needed for R&D, marketing, etc.)
Development Plan

The game will be implemented in phases, with each phase adding complexity and allowing for testing of core features:

Phase 1: Core Framework, UI, and Basic Features
Build the time system, a fully designed UI (with placeholders for future functionality), and basic marketplace, production, and inventory mechanics.
Implement the modular structure with data files and modules.
Implement basic compounding with a limited number of dosage forms and equipment.
Implement customer types, basic insurance, and a simple reputation system.
At the end of Phase 1, the player should be able to run a primitive pharmacy, assign tasks, monitor progress bars, manage inventory, interact with customers, handle insurance claims, and experience reputation changes.
Phase 2: Financial and Customer Systems
Add detailed profit/loss tracking, customer feedback, brand/reputation mechanics, and more advanced employee management.
Expand on customer interactions, including counseling.
Phase 3: Advanced Operations
Introduce more complex compounding mechanics, including ingredient interactions, a wider range of dosage forms and equipment.
Implement shipping/logistics for online orders.
Add employee specialization (e.g., compounding pharmacist, technician).
Phase 4: Expansion Features
Add proprietary drug R&D, partnerships, marketing, and achievements tracking.
Phase 5: Final Polishing
Refine the game with CSR mechanics, dynamic loans, competition AI, and scalable UI.
Thoroughly test and balance all game systems.
Technical Requirements

Programming Language: All code should be written in JavaScript, with supporting HTML/CSS for UI.
Save System:
Create a save file (e.g., JSON format) containing all game data.
Allow players to export/import save files for portability.
Code Format:
Provide full file rewrites for ease of integration.
Include a clear file structure and implementation guidance for minimal programming experience.
Modularity:
Emphasize a modular design with separate files for data and modules, making it easy to adjust game parameters, add new content, and expand features without modifying core game logic or UI code.
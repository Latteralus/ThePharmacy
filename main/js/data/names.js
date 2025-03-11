// /js/data/names.js

window.namesData = {
  firstNames: [
      'John', 'Emily', 'Michael', 'Sarah', 'Carlos', 'Amina',
      'Alice', 'Chris', 'Mei', 'Ravi', 'David', 'Sophia',
      'James', 'Olivia', 'Ethan', 'Isabella', 'Daniel', 'Mia',
      'Matthew', 'Ava', 'Samuel', 'Chloe', 'Joseph', 'Madison',
      'David', 'Abigail', 'Andrew', 'Elizabeth', 'Ryan', 'Sofia',
      'Nicholas', 'Avery', 'William', 'Ella', 'Anthony', 'Grace',
      'Jonathan', 'Victoria', 'Kyle', 'Hannah', 'Brandon', 'Lily',
      'Jacob', 'Natalie', 'Zachary', 'Zoe', 'Kevin', 'Samantha',
      'Eric', 'Leah', 'Steven', 'Anna', 'Thomas', 'Aria',
      'Brian', 'Gabriella', 'Justin', 'Kaylee', 'Daniel', 'Alexis',
      'Austin', 'Ashley', 'Ryan', 'Claire', 'Jose', 'Evelyn',
      'Jason', 'Julia', 'David', 'Stella', 'Benjamin', 'Lillian',
      'Aaron', 'Alexandra', 'Charles', 'Maya', 'Samuel', 'Lauren',
      'Christopher', 'Jasmine', 'Joshua', 'Amelia', 'Richard', 'Savannah',
      'Logan', 'Audrey', 'Dylan', 'Katherine', 'Nathan', 'Morgan',
      'Gabriel', 'Jennifer', 'Mark', 'Allison', 'Evan', 'Kayla',
      'Tyler', 'Rachel', 'Taylor', 'Emma', 'Jordan', 'Jessica',
      'Angel', 'Andrea', 'Austin', 'Hailey', 'Bryan', 'Vanessa',
      'Luis', 'Nicole', 'Scott', 'Genesis', 'Adrian', 'Sydney',
      'Jared', 'Madeline', 'Isaac', 'Brianna', 'Diego', 'Stephanie',
      'Lucas', 'Amanda', 'Alex', 'Alyssa', 'Isaac', 'Melanie',
      'Cole', 'Kimberly', 'Elijah', 'Lucy', 'Jack', 'Kaitlyn',
      'Luke', 'Megan', 'Jordan', 'Faith', 'Owen', 'Jennifer'
  ],
  lastNames: [
      'Smith', 'Johnson', 'Garcia', 'Lee', 'Singh',
      'Brown', 'Miller', 'Wong', 'Davis', 'Rodriguez',
      'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Perez',
      'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore',
      'Jackson', 'Martin', 'Lee', 'Thompson', 'White',
      'Harris', 'Lewis', 'Allen', 'Young', 'King',
      'Wright', 'Torres', 'Nguyen', 'Hill', 'Green',
      'Adams', 'Baker', 'Nelson', 'Carter', 'Mitchell',
      'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell',
      'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart',
      'Sanchez', 'Morris', 'Rogers', 'Reed', 'Cook',
      'Morgan', 'Bell', 'Murphy', 'Bailey', 'Rivera',
      'Cooper', 'Richardson', 'Cox', 'Howard', 'Ward',
      'Peterson', 'Gray', 'James', 'Watson', 'Brooks',
      'Kelly', 'Sanders', 'Price', 'Bennett', 'Wood',
      'Barnes', 'Ross', 'Henderson', 'Coleman', 'Jenkins',
      'Perry', 'Powell', 'Long', 'Patterson', 'Hughes',
      'Flores', 'Washington', 'Butler', 'Simmons', 'Foster',
      'Gonzales', 'Bryant', 'Alexander', 'Russell', 'Griffin',
      'Diaz', 'Hayes', 'Myers', 'Ford', 'Hamilton', 'Graham',
      'Sullivan', 'Wallace', 'Woods', 'Cole', 'West', 'Jordan',
      'Owens', 'Reynolds', 'Fisher', 'Ellis', 'Harrison', 'Gibson'
  ]
};

/**
* Generates a random first name from namesData.
*/
function getRandomFirstName() {
  const firstNames = window.namesData.firstNames;
  const randomIndex = Math.floor(Math.random() * firstNames.length);
  return firstNames[randomIndex];
}

/**
* Generates a random last name from namesData.
*/
function getRandomLastName() {
  const lastNames = window.namesData.lastNames;
  const randomIndex = Math.floor(Math.random() * lastNames.length);
  return lastNames[randomIndex];
}

/**
* Generates a random doctor name with the "Dr." prefix.
*/
function generateDoctorName() {
  const firstName = getRandomFirstName();
  const lastName = getRandomLastName();
  return `Dr. ${firstName} ${lastName}`;
}

window.getRandomFirstName = getRandomFirstName;
window.getRandomLastName = getRandomLastName;
window.generateDoctorName = generateDoctorName;
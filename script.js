const FILLER_CHAR = "<";
const CHECK_DIGIT = "checkdigit";
const LINE_LENGTH = 44;

document
  .querySelector("#td3-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const format = "td3"; // Should later be set by the tab selected by the user
    const formatDefinition = await getFormatDefintion(format);
    document.querySelector("#output").value = createMRZString(formatDefinition);
  });

function createMRZString(formatDefinition) {
  // Construct the MRZ string
  let mrzString = "";

  for (const [key, value] of Object.entries(formatDefinition)) {
    const normalizedKey = key.toLowerCase();

    // The name field requires special handling
    if (normalizedKey === "name") {
      mrzString += formatField(handleNameField(), value);
      continue;
    }

    // Calculate composite check digit
    if (normalizedKey.startsWith("composite")) {
      mrzString += handleCompositeCheckDigit(value, mrzString);
      continue;
    }

    // Calculate check digit
    if (normalizedKey.endsWith(CHECK_DIGIT)) {
      mrzString += handleCheckDigit(value, mrzString);
      continue;
    }

    // The date fields requires special handling
    if (normalizedKey.startsWith("date")) {
      const dateValue = document.querySelector(`#${kebabCase(key)}`).value;
      mrzString += formatDate(dateValue);
      continue;
    }

    // Get input value by converting the camelCase key to kebab-case
    const inputValue = document.querySelector(`#${kebabCase(key)}`).value;
    mrzString += formatField(inputValue, value);
  }

  return mrzString;
}

async function getFormatDefintion(format) {
  try {
    const response = await fetch(`./${format}.json`);

    if (!response.ok) {
      throw new Error(response);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching format definition:", error);
  }
}

function formatField(value, length) {
  // Replace spaces with filler characters and truncate or pad the value
  const formattedValue = value.replaceAll(/\s+/g, FILLER_CHAR).toUpperCase();
  return formattedValue.length > length
    ? formattedValue.substring(0, length)
    : formattedValue.padEnd(length, FILLER_CHAR);
}

function formatDate(date) {
  const dateParts = date.split("-");
  if (dateParts.length !== 3) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD.");
  }

  const year = dateParts[0].slice(-2);
  const month = dateParts[1].padStart(2, "0");
  const day = dateParts[2].padStart(2, "0");

  return year + month + day;
}

function handleNameField() {
  const givenNames = document.querySelector("#given-names").value;
  const surname = document.querySelector("#surname").value;
  return surname + "<<" + givenNames;
}

function handleCompositeCheckDigit(values, mrzString) {
  let checkDigitString = "";
  for (const value of values) {
    checkDigitString += mrzString.substring(
      value[0] + LINE_LENGTH,
      value[1] + LINE_LENGTH
    );
  }

  return calculateCheckDigit(checkDigitString);
}

function handleCheckDigit(value, mrzString) {
  return calculateCheckDigit(
    mrzString.substring(value[0] + LINE_LENGTH, value[1] + LINE_LENGTH)
  );
}

const WEIGHTS = [7, 3, 1];

function calculateCheckDigit(string) {
  // Add transliteration for characters
  const sanitizedString = string.replaceAll(/</g, "0");
  let sum = 0;

  for (let i = 0; i < sanitizedString.length; i++) {
    let number = Number(sanitizedString[i]);

    if (isNaN(number)) {
      number = sanitizedString[i].toUpperCase().charCodeAt(0) - 55;
    }

    sum += number * WEIGHTS[i % 3];
  }

  return sum % 10;
}

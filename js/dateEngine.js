// Global Date Processing Utility Module 
export const DateEngine = {
  /**
   * Transforms standard inputs or timestamps to clear 'mm-dd-yyyy' configurations.
   * @param {string|Date} inputDate 
   */
  stringify: (inputDate) => {
    if (!inputDate) return '';
    const dateObj = new Date(inputDate);
    
    // Prevent invalid fallback parsing crashes
    if (isNaN(dateObj.getTime())) {
      // Check if string is already formatted as MM-DD-YYYY or split
      if (typeof inputDate === 'string' && inputDate.includes('-')) {
        const structuralParts = inputDate.split('-');
        if (structuralParts[0].length === 4) { // looks like yyyy-mm-dd
          return `${structuralParts[1]}-${structuralParts[2]}-${structuralParts[0]}`;
        }
      }
      return inputDate;
    }

    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const year = dateObj.getFullYear();

    return `${month}-${day}-${year}`;
  },

  /**
   * Reverses 'mm-dd-yyyy' strings back to HTML date-picker standard 'yyyy-mm-dd' strings
   * @param {string} mdyString 
   */
  toPickerFormat: (mdyString) => {
    if (!mdyString || !mdyString.includes('-')) return '';
    const [m, d, y] = mdyString.split('-');
    if (m.length === 4) return mdyString; // already standard
    return `${y}-${m}-${d}`;
  }
};

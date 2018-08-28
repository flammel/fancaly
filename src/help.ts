export function helpText(): string {
  return helpTextForTest()
    .trim()
    .split("\n")
    .map((line) => line.trim().split(/\ {4,}/))
    .map((parts) => parts[0].trim())
    .join("\n");
}

export function helpTextForTest(): string {
  return `
    # Welcome to Fancaly!

    #
    # Basic Calculations
    #

    2 * 3               6
    3.78 + 1            4.78
    15 / 2              7.5
    99 - 100            -1

    The operations * and / have higher precedence
    than + and -, and you can use parentheses:

    3 * 7 + 2                   23
    3 * (7 + 2)                 27

    #
    # Variables
    #

    You can define variables using ":" or "=".
    A variable name must contain only characters
    and underscores.

    a_b = 10            10
    c: 7                7
    a_b * c             70

    You cannot define a variable that has the
    same name as a unit:

    y: 10               10
    y                   10
    mm: 10              10
    mm

    #
    # Units
    #

    All numbers and variables can have units:

    10 mm                       10 mm
    y: 20                       20
    y km                        20 km

    You can convert between units using "to" or "as":

    123 mm to cm                12.3 cm
    3456 g as kg                3.456 kg

    This also works for currencies and with variables:

    price: 10 €                 10 EUR
    price to USD                10 USD

    If you use units in calculations, they are
    converted automatically:

    123 mm + 3 cm               153 mm
    (123 mm + 3 cm) to cm       15.3 cm

    #
    # Aggregators
    #

    A line that contains only the word "sum" or "average"
    will calculate the sum or average of all lines above
    up to the next empty line. Units will be converted
    automatically.

    10 cm               10 cm
    30 mm               30 mm
    2 in                2 in
    sum                 18.08 cm

    10                  10
    20                  20
    30                  30
    average             20

    #
    # Percentages
    #

    100 € + 20 %              120 EUR
    100 $ - 20 %              80 USD
    100 * 20 %                20

    #
    # Comments
    #

    All lines that start with # are comments.
    Lines that fancaly does not understand are
    also treated as comments.

    # 1 + 1
    1 + 1                   2
    fancaly does not know what to do

    #
    # Saving Calculations
    #

    The "Save" button in the left column will
    save the calculation locally in your browser. It
    will not be synced to a server!

    If the first line of your calculation starts
    with a #, then that line will be used as a
    "filename" and will be displayed in the list
    of saved calculations.

    #
    # Whitespace
    #

    Whitespace is generally not important:

    a:10mm*(10-7)            30 mm
    7*   (  3-   2)           7
  `;
}

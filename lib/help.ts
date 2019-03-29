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

    You can also do calculations with very large numbers:

    239487932423402374*2364981629873245897632458963429384756      566384560757671918706202925369911087820345279049810744

    And you can put calculations somewhere in text:

    The total length is 43 in + 10 ft if I measured correctly           163 in

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

    30 € for the train ticket     30 EUR
    60 € for the hotel            60 EUR
    total sum for the holiday     90 EUR

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
    10 % on what is 110       100
    10 % off what is 90       100
    10 % of what is 20        200
    40 as a % off 100         60 %
    15 as a % on 10           50 %
    40 as a % of 100          40 %
    10 % on 111               122.1
    10 % off 111              99.9
    10 % of 111               11.1

    #
    # Comments
    #

    All lines that start with # are comments
    and will not be evaluated:

    # 1 + 1
    1 + 1                   2

    Lines that do not contain a calculation will also
    be ignored:

    This line will be ignored, it contains no calculation
    This line 1 cm + 1 mm contains a calculation          11 mm
    This line 3784 g as kg contains a conversion          3.784 kg

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

    a:10mm*(10-7)            3 cm
    7*   (  3-   2)           7
  `;
}

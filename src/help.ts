export const helpData = `
# Start a line with "#" to ignore it.
# To share or save a document, copy or bookmark its URL.

# You can use commas or periods as decimal separators:

2.7183 + 3,1416 | 5.8599

# The output on the right will always use periods as
# decimal separator and space as thousands separator.

# The output will be rounded to 12 decimal places:

10 / 3 * 2 | 6.6666 6666 6667

# Use underscores or spaces to format large numbers:

31_536_000 | 31 536 000
40 075.017 | 40 075.017

# Use = or : to define variables:

pi = 3,1416 | 3.1416
e: 2.7183 | 2.7183
pi - e | 0.4233

# Use "sum" or "total" to add up values
# up to the first preceding line without a calculation:

1 | 1
2 | 2
sum | 3

3 | 3
4 | 4
total | 7

# Use "average", "avg" or "mean" to calculate the average:

5 | 5
6 | 6
avg | 5.5

# Use "to", "in" or "->" to convert units:

3 ft in m | 0.9144 m
1 oz -> g | 28.3495 g
(1 cm + 1 in) to mm | 35.4 mm

# Percentage calculations:

100 + 20 % | 120
100 * 20 % | 20
100 - 20 % | 80

# Functions

# To round values, use round():

round(pi) | 3
round(10/3; 2) | 3.33

# Other available functions are:
# - sin, cos, tan
# - arcsin, arccos, arctan
# - abs
# - ln, ld, lg
# - sqrt

`.trim();

export const helpInput = helpData
    .split('\n')
    .map((line) => line.split('|').at(0)?.trim() ?? '')
    .join('\n');
export const helpOutput = helpData
    .split('\n')
    .map((line) => line.split('|').at(1)?.trim() ?? '')
    .join('\n');

import pandas as pd

# Define file paths
strategic_csv_path = "strategic_CIP.csv"
one_year_csv_path = "one_year_CIP.csv"
html_file_path = "capital_plan.html"

# Load the CSV files
df_strategic = pd.read_csv(strategic_csv_path)
df_one_year = pd.read_csv(one_year_csv_path)

# Read the existing HTML file
with open(html_file_path, "r", encoding="utf-8") as file:
    html_content = file.read()

# Function to format DataFrame as a well-structured HTML table
def dataframe_to_html_table(df, table_id):
    table_html = f'<table id="{table_id}" class="table-container" border="1">'
    table_html += "<thead><tr>" + "".join(f"<th>{col}</th>" for col in df.columns) + "</tr></thead>"
    table_html += "<tbody>" + "".join(
        "<tr>" + "".join(f"<td>{cell}</td>" for cell in row) + "</tr>" for _, row in df.iterrows()
    ) + "</tbody></table>"
    return table_html

# Convert dataframes to HTML tables
strategic_table_html = dataframe_to_html_table(df_strategic, "strategic_funding_table")
one_year_table_html = dataframe_to_html_table(df_one_year, "one_year_recommendations_table")

# Replace placeholders in the HTML file
updated_html_content = html_content.replace(
    "<!-- STRATEGIC FUNDING TABLE PLACEHOLDER -->", strategic_table_html
).replace(
    "<!-- ONE YEAR RECOMMENDATIONS TABLE PLACEHOLDER -->", one_year_table_html
)

# Save the updated HTML file
updated_html_file_path = "updated_capital_plan.html"
with open(updated_html_file_path, "w", encoding="utf-8") as file:
    file.write(updated_html_content)

print(f"Updated HTML file saved as {updated_html_file_path}")

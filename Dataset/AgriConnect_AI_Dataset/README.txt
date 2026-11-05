AgriConnect AI — 100,000-row synthetic dataset
=================================================

TOTAL ROWS: 100,000 across 9 CSV files.

Files:
- users.csv (5,000): demo users and roles
- harvests.csv (25,000): crop harvests and farmer locations
- market_prices.csv (30,000): synthetic market prices
- warehouses.csv (5,000): storage facilities and capacity
- transport_services.csv (5,000): vehicles, capacity, and rates
- industry_buyers.csv (3,000): processors, exporters, and biomass buyers
- biomass_listings.csv (12,000): agricultural residue listings
- bookings.csv (10,000): sample storage, transport, and sale bookings
- recommendations.csv (5,000): illustrative recommendation scenarios

IMPORTANT:
All data is synthetically generated for development, demos, and testing.
It is NOT real-world market data and should not be used for actual farmer decisions,
financial claims, training a production forecasting model, or environmental impact claims.
The recommendations and forecast-like values are illustrative, not outputs from a trained AI model.

Suggested workflow:
1. Inspect CSV column names and units.
2. Import each CSV into MongoDB collections or write a Node.js seed script that maps
   these records into your Mongoose models.
3. Check your existing backend model field names before importing.
4. Keep the data_source field so demo records remain identifiable.
5. Replace market_prices.csv with licensed/official data for real price analysis.

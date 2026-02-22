# HTTPS Setup for Development

If you're using HTTPS for the API Gateway (`https://localhost:7000`), you'll need to accept the self-signed certificate in your browser first.

## Option 1: Accept the Certificate (Recommended for HTTPS)

1. Open your browser and navigate to: `https://localhost:7000/swagger`
2. You'll see a security warning about the certificate
3. Click "Advanced" or "Show Details"
4. Click "Proceed to localhost" or "Accept the Risk and Continue"
5. Once accepted, the frontend should be able to connect

## Option 2: Use HTTP Instead (Easier for Development)

The API Gateway also runs on HTTP (port 5000) when using the HTTPS profile. You can:

1. Update `.env` file in the frontend directory:
   ```env
   VITE_API_BASE_URL=http://localhost:5000
   ```

2. Or restart the API Gateway with the HTTP profile:
   ```powershell
   cd services/fuji36-services
   dotnet run --project fuji36-api-gateway --launch-profile http
   ```

## Option 3: Restart API Gateway with HTTP Profile

To run only on HTTP (no certificate issues):

```powershell
cd C:\Shimon\Dana\Fuji36\services\fuji36-services
dotnet run --project fuji36-api-gateway --launch-profile http
```

This will run the API Gateway on `http://localhost:5000` only.

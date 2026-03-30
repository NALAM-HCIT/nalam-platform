# ── Build Stage ────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0.0-bookworm AS build

WORKDIR /src

# Copy and restore project file
COPY global.json .
COPY NalamApi/NalamApi.csproj ./NalamApi/
RUN dotnet restore NalamApi/NalamApi.csproj

# Copy source code
COPY NalamApi ./NalamApi
WORKDIR /src/NalamApi

# Build and publish
RUN dotnet publish -c Release --no-restore -o /app/publish

# ── Runtime Stage ─────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0.0-bookworm-slim AS runtime

WORKDIR /app

COPY --from=build /app/publish .

# Create non-root user for security
RUN useradd -m -u 1000 dotnetuser && chown -R dotnetuser:dotnetuser /app
USER dotnetuser

# Railway uses PORT env variable, default to 5000
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://+:5000 \
    DOTNET_EnableDiagnostics=0

EXPOSE 5000

ENTRYPOINT ["dotnet", "NalamApi.dll"]

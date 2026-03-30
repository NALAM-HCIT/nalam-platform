# ── Build Stage ────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project file and restore dependencies
COPY NalamApi.csproj ./
RUN dotnet restore --no-cache

# Copy source code and publish
COPY . .
RUN dotnet publish -c Release --no-restore -o /app/publish

# ── Runtime Stage ─────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://+:5000 \
    DOTNET_EnableDiagnostics=0

EXPOSE 5000

ENTRYPOINT ["dotnet", "NalamApi.dll"]

# ── Build Stage ────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY NalamApi.csproj ./
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish

# ── Runtime Stage ─────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

# Railway uses PORT env variable
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 5000

ENTRYPOINT ["dotnet", "NalamApi.dll"]

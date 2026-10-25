FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["MotoRental.Api.csproj", "./"]
RUN dotnet restore "MotoRental.Api.csproj"

COPY . .
RUN dotnet publish "MotoRental.Api.csproj" \
    --configuration Release \
    --output /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

RUN mkdir -p /app/data && chown -R $APP_UID:$APP_UID /app
USER $APP_UID

EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080
ENTRYPOINT ["dotnet", "MotoRental.Api.dll"]
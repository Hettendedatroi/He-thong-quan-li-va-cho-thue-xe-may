using Microsoft.Data.Sqlite;

public sealed class QaBugSeedService
{
    private static readonly HashSet<string> KnownBugIds =
    [
        "BUG-01", "BUG-02", "BUG-03", "BUG-04", "BUG-05", "BUG-06", "BUG-07",
        "BUG-08", "BUG-09", "BUG-10", "BUG-11", "BUG-12", "BUG-13"
    ];

    private readonly HashSet<string> _enabledIds;

    private QaBugSeedService(bool isEnabled, IEnumerable<string> enabledIds, string? databasePath)
    {
        IsEnabled = isEnabled;
        _enabledIds = new HashSet<string>(enabledIds, StringComparer.OrdinalIgnoreCase);
        DatabasePath = databasePath;
    }

    public bool IsEnabled { get; }
    public bool RequiresLoopbackOnly => _enabledIds.Overlaps(["BUG-07", "BUG-08", "BUG-09", "BUG-10"]);
    public IReadOnlyCollection<string> EnabledIds => _enabledIds;
    private string? DatabasePath { get; }

    public bool IsBugEnabled(string bugId) => IsEnabled && _enabledIds.Contains(bugId);

    public static QaBugSeedService FromConfiguration(
        IHostEnvironment environment,
        IConfiguration configuration)
    {
        var isEnabled = bool.TryParse(configuration["QA_BUG_SEEDING_ENABLED"], out var enabled) && enabled;
        if (!isEnabled)
            return new QaBugSeedService(false, Array.Empty<string>(), null);

        if (!environment.IsDevelopment() && !environment.IsEnvironment("QA"))
            throw new InvalidOperationException("QA bug seeding is permitted only in Development or QA.");

        var ids = (configuration["QA_BUG_IDS"] ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(id => id.ToUpperInvariant())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var unknownIds = ids.Where(id => !KnownBugIds.Contains(id)).ToArray();
        if (unknownIds.Length > 0)
            throw new InvalidOperationException($"Unknown QA bug ID(s): {string.Join(", ", unknownIds)}.");

        if (ids.Any(id => id is "BUG-07" or "BUG-08" or "BUG-09" or "BUG-10")
            && !string.IsNullOrWhiteSpace(configuration["PORT"]))
        {
            throw new InvalidOperationException("Security-related QA bug seeds cannot run with a public PORT binding.");
        }

        var databasePath = configuration["QA_DATABASE_PATH"];
        if (ids.Length > 0 && string.IsNullOrWhiteSpace(databasePath))
            throw new InvalidOperationException("QA_DATABASE_PATH is required when QA bug seeds are enabled.");

        return new QaBugSeedService(true, ids, databasePath);
    }

    public string GetConnectionString(string defaultConnectionString)
    {
        if (!IsEnabled || _enabledIds.Count == 0 || DatabasePath is null)
            return defaultConnectionString;

        var qaPath = Path.GetFullPath(DatabasePath);
        var defaultPath = new SqliteConnectionStringBuilder(defaultConnectionString).DataSource;
        if (!string.IsNullOrWhiteSpace(defaultPath) && defaultPath != ":memory:"
            && string.Equals(Path.GetFullPath(defaultPath), qaPath, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("QA_DATABASE_PATH must not point to the normal application database.");
        }

        var directory = Path.GetDirectoryName(qaPath);
        if (!string.IsNullOrEmpty(directory))
            Directory.CreateDirectory(directory);

        var qaConnection = new SqliteConnectionStringBuilder(defaultConnectionString)
        {
            DataSource = qaPath
        };
        return qaConnection.ToString();
    }
}

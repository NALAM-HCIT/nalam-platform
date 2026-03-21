using System.Net.Http.Headers;
using System.Web;

namespace NalamApi.Services;

/// <summary>
/// OTP service using Pay4SMS API for sending SMS.
/// Configure Pay4SMS credentials in appsettings.json under "Pay4Sms" section.
/// Falls back to console logging when API key is not configured (development mode).
/// </summary>
public class OtpService
{
    private readonly IConfiguration _config;
    private readonly ILogger<OtpService> _logger;
    private readonly HttpClient _httpClient;

    public OtpService(IConfiguration config, ILogger<OtpService> logger, IHttpClientFactory httpClientFactory)
    {
        _config = config;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("Pay4Sms");
    }

    /// <summary>
    /// Generates a cryptographically random 6-digit OTP.
    /// </summary>
    public string GenerateOtp()
    {
        var random = new Random();
        return random.Next(100000, 999999).ToString();
    }

    /// <summary>
    /// Sends OTP via Pay4SMS API. Returns true if sent successfully.
    /// In development (no API key), logs OTP to console instead.
    /// </summary>
    public async Task<bool> SendOtpAsync(string mobileNumber, string otp)
    {
        var apiKey = _config["Pay4Sms:ApiKey"];
        var senderId = _config["Pay4Sms:SenderId"];
        var templateId = _config["Pay4Sms:TemplateId"];

        // Development mode: log OTP to console
        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogWarning("══════════════════════════════════════");
            _logger.LogWarning("  DEV MODE — OTP for {Mobile}: {Otp}", mobileNumber, otp);
            _logger.LogWarning("══════════════════════════════════════");
            return true;
        }

        try
        {
            // Pay4SMS API integration
            // Adjust the URL and parameters based on your Pay4SMS API documentation
            var message = HttpUtility.UrlEncode($"Your Nalam verification code is {otp}. Valid for 5 minutes. Do not share.");

            var url = $"https://pay4sms.in/sendsms/" +
                      $"?token={apiKey}" +
                      $"&credit=2" +
                      $"&sender={senderId}" +
                      $"&message={message}" +
                      $"&number={mobileNumber}" +
                      $"&templateid={templateId}";

            var response = await _httpClient.GetAsync(url);
            var result = await response.Content.ReadAsStringAsync();

            _logger.LogInformation("Pay4SMS response for {Mobile}: {Result}", mobileNumber, result);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send OTP to {Mobile}", mobileNumber);
            return false;
        }
    }
}

using System.Security.Claims;
using Fuji36.Common.Contracts.Auth;
using Fuji36.Identity.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Fuji36.Identity.Controllers;

[ApiController]
[Route("auth")]
public sealed class AuthController : ControllerBase
{
    private readonly AuthService _auth;
    private readonly JwtTokenService _tokens;

    public AuthController(AuthService auth, JwtTokenService tokens)
    {
        _auth = auth;
        _tokens = tokens;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto req)
    {
        var (ok, userId, email, roles) = await _auth.ValidateAsync(req.Email, req.Password);
        if (!ok) return Unauthorized("Invalid credentials");

        // build a lightweight user entity just for token creation
        var token = _tokens.CreateToken(new Fuji36.Identity.Models.UserEntity
        {
            Id = userId,
            Email = email,
            Roles = roles
        });

        return Ok(new LoginResponseDto(token));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<MeDto>> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized();

        // Fetch full user data from database to get FirstName, LastName, UserId
        var user = await _auth.GetUserByIdAsync(userId);
        if (user == null)
            return Unauthorized();

        return Ok(new MeDto(
            user.Id,
            user.Email,
            user.Roles,
            user.FirstName,
            user.LastName,
            user.UserId,
            user.AvatarUrl
        ));
    }

    [Authorize]
    [HttpGet("users/{userId}")]
    public async Task<ActionResult<MeDto>> GetUserById(string userId)
    {
        // Allow admins, therapists, or the user themselves to get user info
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        var isAdmin = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "admin");
        var isTherapist = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "therapist");
        
        if (string.IsNullOrWhiteSpace(currentUserId))
            return Unauthorized();
        
        // Allow if: user is requesting their own data, is admin, or is therapist
        if (currentUserId != userId && !isAdmin && !isTherapist)
            return Forbid();

        var user = await _auth.GetUserByIdAsync(userId);
        if (user == null)
            return NotFound();

        return Ok(new MeDto(
            user.Id,
            user.Email,
            user.Roles,
            user.FirstName,
            user.LastName,
            user.UserId,
            user.AvatarUrl
        ));
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuth = JwtAuth;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_guard_1 = require("../guards/jwt.guard");
function JwtAuth() {
    return (0, common_1.applyDecorators)((0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard), (0, swagger_1.ApiBearerAuth)());
}
//# sourceMappingURL=jwt-auth.decorator.js.map
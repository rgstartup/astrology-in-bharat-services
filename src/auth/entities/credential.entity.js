"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Credential = void 0;
// src/auth/credential.entity.ts
var typeorm_1 = require("typeorm");
var user_entity_1 = require("@/users/entities/user.entity");
var Credential = function () {
    var _classDecorators = [(0, typeorm_1.Entity)('credentials')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _secretHash_decorators;
    var _secretHash_initializers = [];
    var _secretHash_extraInitializers = [];
    var _type_decorators;
    var _type_initializers = [];
    var _type_extraInitializers = [];
    var _user_decorators;
    var _user_initializers = [];
    var _user_extraInitializers = [];
    var _expiresAt_decorators;
    var _expiresAt_initializers = [];
    var _expiresAt_extraInitializers = [];
    var _revoked_decorators;
    var _revoked_initializers = [];
    var _revoked_extraInitializers = [];
    var _ipAddress_decorators;
    var _ipAddress_initializers = [];
    var _ipAddress_extraInitializers = [];
    var _userAgent_decorators;
    var _userAgent_initializers = [];
    var _userAgent_extraInitializers = [];
    var _createdAt_decorators;
    var _createdAt_initializers = [];
    var _createdAt_extraInitializers = [];
    var Credential = _classThis = /** @class */ (function () {
        function Credential_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            // hashed refresh token (or session secret)
            this.secretHash = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _secretHash_initializers, void 0));
            // distinguish between auth types (useful if you later expand)
            this.type = (__runInitializers(this, _secretHash_extraInitializers), __runInitializers(this, _type_initializers, void 0));
            this.user = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _user_initializers, void 0));
            this.expiresAt = (__runInitializers(this, _user_extraInitializers), __runInitializers(this, _expiresAt_initializers, void 0));
            this.revoked = (__runInitializers(this, _expiresAt_extraInitializers), __runInitializers(this, _revoked_initializers, void 0));
            this.ipAddress = (__runInitializers(this, _revoked_extraInitializers), __runInitializers(this, _ipAddress_initializers, void 0));
            this.userAgent = (__runInitializers(this, _ipAddress_extraInitializers), __runInitializers(this, _userAgent_initializers, void 0));
            this.createdAt = (__runInitializers(this, _userAgent_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            __runInitializers(this, _createdAt_extraInitializers);
        }
        return Credential_1;
    }());
    __setFunctionName(_classThis, "Credential");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _secretHash_decorators = [(0, typeorm_1.Column)()];
        _type_decorators = [(0, typeorm_1.Column)({ default: 'refresh_token' })];
        _user_decorators = [(0, typeorm_1.ManyToOne)(function () { return user_entity_1.User; }, function (u) { return u.credentials; }, { onDelete: 'CASCADE' }), (0, typeorm_1.JoinColumn)({ name: 'user_id' })];
        _expiresAt_decorators = [(0, typeorm_1.Column)({ type: 'timestamptz' })];
        _revoked_decorators = [(0, typeorm_1.Column)({ default: false })];
        _ipAddress_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _userAgent_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)()];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _secretHash_decorators, { kind: "field", name: "secretHash", static: false, private: false, access: { has: function (obj) { return "secretHash" in obj; }, get: function (obj) { return obj.secretHash; }, set: function (obj, value) { obj.secretHash = value; } }, metadata: _metadata }, _secretHash_initializers, _secretHash_extraInitializers);
        __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: function (obj) { return "type" in obj; }, get: function (obj) { return obj.type; }, set: function (obj, value) { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
        __esDecorate(null, null, _user_decorators, { kind: "field", name: "user", static: false, private: false, access: { has: function (obj) { return "user" in obj; }, get: function (obj) { return obj.user; }, set: function (obj, value) { obj.user = value; } }, metadata: _metadata }, _user_initializers, _user_extraInitializers);
        __esDecorate(null, null, _expiresAt_decorators, { kind: "field", name: "expiresAt", static: false, private: false, access: { has: function (obj) { return "expiresAt" in obj; }, get: function (obj) { return obj.expiresAt; }, set: function (obj, value) { obj.expiresAt = value; } }, metadata: _metadata }, _expiresAt_initializers, _expiresAt_extraInitializers);
        __esDecorate(null, null, _revoked_decorators, { kind: "field", name: "revoked", static: false, private: false, access: { has: function (obj) { return "revoked" in obj; }, get: function (obj) { return obj.revoked; }, set: function (obj, value) { obj.revoked = value; } }, metadata: _metadata }, _revoked_initializers, _revoked_extraInitializers);
        __esDecorate(null, null, _ipAddress_decorators, { kind: "field", name: "ipAddress", static: false, private: false, access: { has: function (obj) { return "ipAddress" in obj; }, get: function (obj) { return obj.ipAddress; }, set: function (obj, value) { obj.ipAddress = value; } }, metadata: _metadata }, _ipAddress_initializers, _ipAddress_extraInitializers);
        __esDecorate(null, null, _userAgent_decorators, { kind: "field", name: "userAgent", static: false, private: false, access: { has: function (obj) { return "userAgent" in obj; }, get: function (obj) { return obj.userAgent; }, set: function (obj, value) { obj.userAgent = value; } }, metadata: _metadata }, _userAgent_initializers, _userAgent_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: function (obj) { return "createdAt" in obj; }, get: function (obj) { return obj.createdAt; }, set: function (obj, value) { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Credential = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Credential = _classThis;
}();
exports.Credential = Credential;

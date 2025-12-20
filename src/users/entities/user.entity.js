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
exports.User = void 0;
// src/users/user.entity.ts
var typeorm_1 = require("typeorm");
var oauth_accounts_entity_1 = require("../../auth/entities/oauth-accounts.entity");
var credential_entity_1 = require("../../auth/entities/credential.entity");
var roles_entity_1 = require("@/role/entities/roles.entity");
var class_transformer_1 = require("class-transformer");
// import { ProfileClient } from './profile-client.entity';
var profile_client_entity_1 = require("@/client/profile/entities/profile-client.entity");
var profile_expert_entity_1 = require("../../expert/profile/entities/profile-expert.entity");
var User = function () {
    var _classDecorators = [(0, typeorm_1.Entity)('users')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _email_decorators;
    var _email_initializers = [];
    var _email_extraInitializers = [];
    var _password_decorators;
    var _password_initializers = [];
    var _password_extraInitializers = [];
    var _emailVerified_decorators;
    var _emailVerified_initializers = [];
    var _emailVerified_extraInitializers = [];
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _roles_decorators;
    var _roles_initializers = [];
    var _roles_extraInitializers = [];
    var _oauthAccounts_decorators;
    var _oauthAccounts_initializers = [];
    var _oauthAccounts_extraInitializers = [];
    var _credentials_decorators;
    var _credentials_initializers = [];
    var _credentials_extraInitializers = [];
    var _createdAt_decorators;
    var _createdAt_initializers = [];
    var _createdAt_extraInitializers = [];
    var _updatedAt_decorators;
    var _updatedAt_initializers = [];
    var _updatedAt_extraInitializers = [];
    var _profile_client_decorators;
    var _profile_client_initializers = [];
    var _profile_client_extraInitializers = [];
    var _profile_expert_decorators;
    var _profile_expert_initializers = [];
    var _profile_expert_extraInitializers = [];
    var User = _classThis = /** @class */ (function () {
        function User_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.email = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _email_initializers, void 0));
            this.password = (__runInitializers(this, _email_extraInitializers), __runInitializers(this, _password_initializers, void 0)); // argon2 hash
            this.emailVerified = (__runInitializers(this, _password_extraInitializers), __runInitializers(this, _emailVerified_initializers, void 0));
            this.name = (__runInitializers(this, _emailVerified_extraInitializers), __runInitializers(this, _name_initializers, void 0));
            this.roles = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _roles_initializers, void 0));
            this.oauthAccounts = (__runInitializers(this, _roles_extraInitializers), __runInitializers(this, _oauthAccounts_initializers, void 0));
            this.credentials = (__runInitializers(this, _oauthAccounts_extraInitializers), __runInitializers(this, _credentials_initializers, void 0));
            this.createdAt = (__runInitializers(this, _credentials_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            this.profile_client = (__runInitializers(this, _updatedAt_extraInitializers), __runInitializers(this, _profile_client_initializers, void 0));
            this.profile_expert = (__runInitializers(this, _profile_client_extraInitializers), __runInitializers(this, _profile_expert_initializers, void 0));
            __runInitializers(this, _profile_expert_extraInitializers);
        }
        return User_1;
    }());
    __setFunctionName(_classThis, "User");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _email_decorators = [(0, typeorm_1.Column)({ unique: true })];
        _password_decorators = [(0, typeorm_1.Column)({ select: false, nullable: true }), (0, class_transformer_1.Exclude)()];
        _emailVerified_decorators = [(0, typeorm_1.Column)({ default: false })];
        _name_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _roles_decorators = [(0, typeorm_1.ManyToMany)(function () { return roles_entity_1.Role; }, function (r) { return r.users; }, { eager: true }), (0, typeorm_1.JoinTable)({
                name: 'user_roles',
                joinColumn: { name: 'user_id', referencedColumnName: 'id' },
                inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
            })];
        _oauthAccounts_decorators = [(0, typeorm_1.OneToMany)(function () { return oauth_accounts_entity_1.OAuthAccount; }, function (oa) { return oa.user; })];
        _credentials_decorators = [(0, typeorm_1.OneToMany)(function () { return credential_entity_1.Credential; }, function (c) { return c.user; })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)()];
        _updatedAt_decorators = [(0, typeorm_1.UpdateDateColumn)()];
        _profile_client_decorators = [(0, typeorm_1.OneToOne)(function () { return profile_client_entity_1.ProfileClient; }, function (p) { return p.user; }, { cascade: true })];
        _profile_expert_decorators = [(0, typeorm_1.OneToOne)(function () { return profile_expert_entity_1.ProfileExpert; }, function (p) { return p.user; }, { cascade: true })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _email_decorators, { kind: "field", name: "email", static: false, private: false, access: { has: function (obj) { return "email" in obj; }, get: function (obj) { return obj.email; }, set: function (obj, value) { obj.email = value; } }, metadata: _metadata }, _email_initializers, _email_extraInitializers);
        __esDecorate(null, null, _password_decorators, { kind: "field", name: "password", static: false, private: false, access: { has: function (obj) { return "password" in obj; }, get: function (obj) { return obj.password; }, set: function (obj, value) { obj.password = value; } }, metadata: _metadata }, _password_initializers, _password_extraInitializers);
        __esDecorate(null, null, _emailVerified_decorators, { kind: "field", name: "emailVerified", static: false, private: false, access: { has: function (obj) { return "emailVerified" in obj; }, get: function (obj) { return obj.emailVerified; }, set: function (obj, value) { obj.emailVerified = value; } }, metadata: _metadata }, _emailVerified_initializers, _emailVerified_extraInitializers);
        __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
        __esDecorate(null, null, _roles_decorators, { kind: "field", name: "roles", static: false, private: false, access: { has: function (obj) { return "roles" in obj; }, get: function (obj) { return obj.roles; }, set: function (obj, value) { obj.roles = value; } }, metadata: _metadata }, _roles_initializers, _roles_extraInitializers);
        __esDecorate(null, null, _oauthAccounts_decorators, { kind: "field", name: "oauthAccounts", static: false, private: false, access: { has: function (obj) { return "oauthAccounts" in obj; }, get: function (obj) { return obj.oauthAccounts; }, set: function (obj, value) { obj.oauthAccounts = value; } }, metadata: _metadata }, _oauthAccounts_initializers, _oauthAccounts_extraInitializers);
        __esDecorate(null, null, _credentials_decorators, { kind: "field", name: "credentials", static: false, private: false, access: { has: function (obj) { return "credentials" in obj; }, get: function (obj) { return obj.credentials; }, set: function (obj, value) { obj.credentials = value; } }, metadata: _metadata }, _credentials_initializers, _credentials_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: function (obj) { return "createdAt" in obj; }, get: function (obj) { return obj.createdAt; }, set: function (obj, value) { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: function (obj) { return "updatedAt" in obj; }, get: function (obj) { return obj.updatedAt; }, set: function (obj, value) { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, null, _profile_client_decorators, { kind: "field", name: "profile_client", static: false, private: false, access: { has: function (obj) { return "profile_client" in obj; }, get: function (obj) { return obj.profile_client; }, set: function (obj, value) { obj.profile_client = value; } }, metadata: _metadata }, _profile_client_initializers, _profile_client_extraInitializers);
        __esDecorate(null, null, _profile_expert_decorators, { kind: "field", name: "profile_expert", static: false, private: false, access: { has: function (obj) { return "profile_expert" in obj; }, get: function (obj) { return obj.profile_expert; }, set: function (obj, value) { obj.profile_expert = value; } }, metadata: _metadata }, _profile_expert_initializers, _profile_expert_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        User = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return User = _classThis;
}();
exports.User = User;

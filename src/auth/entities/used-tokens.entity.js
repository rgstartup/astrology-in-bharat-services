"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsedTokens = void 0;
var typeorm_1 = require("typeorm");
var user_entity_1 = require("@/users/entities/user.entity");
var crypto_1 = require("crypto");
var UsedTokens = function () {
    var _classDecorators = [(0, typeorm_1.Entity)(), (0, typeorm_1.Unique)(['user', 'token'])];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _user_decorators;
    var _user_initializers = [];
    var _user_extraInitializers = [];
    var _token_decorators;
    var _token_initializers = [];
    var _token_extraInitializers = [];
    var _purpose_decorators;
    var _purpose_initializers = [];
    var _purpose_extraInitializers = [];
    var _used_at_decorators;
    var _used_at_initializers = [];
    var _used_at_extraInitializers = [];
    var _hashToken_decorators;
    var UsedTokens = _classThis = /** @class */ (function () {
        function UsedTokens_1() {
            this.id = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _id_initializers, void 0));
            this.user = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _user_initializers, void 0));
            this.token = (__runInitializers(this, _user_extraInitializers), __runInitializers(this, _token_initializers, void 0));
            this.purpose = (__runInitializers(this, _token_extraInitializers), __runInitializers(this, _purpose_initializers, void 0));
            this.used_at = (__runInitializers(this, _purpose_extraInitializers), __runInitializers(this, _used_at_initializers, void 0));
            __runInitializers(this, _used_at_extraInitializers);
        }
        UsedTokens_1.prototype.hashToken = function () {
            this.token = (0, crypto_1.createHash)('sha256').update(this.token).digest('hex');
        };
        return UsedTokens_1;
    }());
    __setFunctionName(_classThis, "UsedTokens");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _user_decorators = [(0, typeorm_1.ManyToOne)(function () { return user_entity_1.User; }, { onDelete: 'CASCADE' }), (0, typeorm_1.JoinColumn)({ name: 'user_id' })];
        _token_decorators = [(0, typeorm_1.Column)('text')];
        _purpose_decorators = [(0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true })];
        _used_at_decorators = [(0, typeorm_1.CreateDateColumn)({
                type: 'timestamptz',
            })];
        _hashToken_decorators = [(0, typeorm_1.BeforeInsert)()];
        __esDecorate(_classThis, null, _hashToken_decorators, { kind: "method", name: "hashToken", static: false, private: false, access: { has: function (obj) { return "hashToken" in obj; }, get: function (obj) { return obj.hashToken; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _user_decorators, { kind: "field", name: "user", static: false, private: false, access: { has: function (obj) { return "user" in obj; }, get: function (obj) { return obj.user; }, set: function (obj, value) { obj.user = value; } }, metadata: _metadata }, _user_initializers, _user_extraInitializers);
        __esDecorate(null, null, _token_decorators, { kind: "field", name: "token", static: false, private: false, access: { has: function (obj) { return "token" in obj; }, get: function (obj) { return obj.token; }, set: function (obj, value) { obj.token = value; } }, metadata: _metadata }, _token_initializers, _token_extraInitializers);
        __esDecorate(null, null, _purpose_decorators, { kind: "field", name: "purpose", static: false, private: false, access: { has: function (obj) { return "purpose" in obj; }, get: function (obj) { return obj.purpose; }, set: function (obj, value) { obj.purpose = value; } }, metadata: _metadata }, _purpose_initializers, _purpose_extraInitializers);
        __esDecorate(null, null, _used_at_decorators, { kind: "field", name: "used_at", static: false, private: false, access: { has: function (obj) { return "used_at" in obj; }, get: function (obj) { return obj.used_at; }, set: function (obj, value) { obj.used_at = value; } }, metadata: _metadata }, _used_at_initializers, _used_at_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UsedTokens = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UsedTokens = _classThis;
}();
exports.UsedTokens = UsedTokens;

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
exports.ProfileClient = void 0;
var user_entity_1 = require("@/users/entities/user.entity");
var typeorm_1 = require("typeorm");
var address_entity_1 = require("@/common/entities/address.entity");
var ProfileClient = function () {
    var _classDecorators = [(0, typeorm_1.Entity)('profile_clients'), (0, typeorm_1.Check)("\"gender\" IN ('male', 'female', 'other')")];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _user_decorators;
    var _user_initializers = [];
    var _user_extraInitializers = [];
    var _date_of_birth_decorators;
    var _date_of_birth_initializers = [];
    var _date_of_birth_extraInitializers = [];
    var _gender_decorators;
    var _gender_initializers = [];
    var _gender_extraInitializers = [];
    var _phone_decorators;
    var _phone_initializers = [];
    var _phone_extraInitializers = [];
    var _preferences_decorators;
    var _preferences_initializers = [];
    var _preferences_extraInitializers = [];
    var _language_preference_decorators;
    var _language_preference_initializers = [];
    var _language_preference_extraInitializers = [];
    var _profile_picture_decorators;
    var _profile_picture_initializers = [];
    var _profile_picture_extraInitializers = [];
    var _addresses_decorators;
    var _addresses_initializers = [];
    var _addresses_extraInitializers = [];
    var _createdAt_decorators;
    var _createdAt_initializers = [];
    var _createdAt_extraInitializers = [];
    var _updatedAt_decorators;
    var _updatedAt_initializers = [];
    var _updatedAt_extraInitializers = [];
    var ProfileClient = _classThis = /** @class */ (function () {
        function ProfileClient_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.user = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _user_initializers, void 0));
            this.date_of_birth = (__runInitializers(this, _user_extraInitializers), __runInitializers(this, _date_of_birth_initializers, void 0));
            this.gender = (__runInitializers(this, _date_of_birth_extraInitializers), __runInitializers(this, _gender_initializers, void 0));
            this.phone = (__runInitializers(this, _gender_extraInitializers), __runInitializers(this, _phone_initializers, void 0));
            this.preferences = (__runInitializers(this, _phone_extraInitializers), __runInitializers(this, _preferences_initializers, void 0));
            this.language_preference = (__runInitializers(this, _preferences_extraInitializers), __runInitializers(this, _language_preference_initializers, void 0));
            this.profile_picture = (__runInitializers(this, _language_preference_extraInitializers), __runInitializers(this, _profile_picture_initializers, void 0));
            this.addresses = (__runInitializers(this, _profile_picture_extraInitializers), __runInitializers(this, _addresses_initializers, void 0));
            this.createdAt = (__runInitializers(this, _addresses_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            __runInitializers(this, _updatedAt_extraInitializers);
        }
        return ProfileClient_1;
    }());
    __setFunctionName(_classThis, "ProfileClient");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _user_decorators = [(0, typeorm_1.OneToOne)(function () { return user_entity_1.User; }, function (user) { return user.profile_client; }), (0, typeorm_1.JoinColumn)()];
        _date_of_birth_decorators = [(0, typeorm_1.Column)({
                type: 'timestamptz',
                nullable: true,
            })];
        _gender_decorators = [(0, typeorm_1.Column)({
                type: 'text',
            })];
        _phone_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _preferences_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _language_preference_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _profile_picture_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _addresses_decorators = [(0, typeorm_1.OneToMany)(function () { return address_entity_1.Address; }, function (address) { return address.profile_client; }, {
                cascade: true,
                eager: true,
            })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)()];
        _updatedAt_decorators = [(0, typeorm_1.UpdateDateColumn)()];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _user_decorators, { kind: "field", name: "user", static: false, private: false, access: { has: function (obj) { return "user" in obj; }, get: function (obj) { return obj.user; }, set: function (obj, value) { obj.user = value; } }, metadata: _metadata }, _user_initializers, _user_extraInitializers);
        __esDecorate(null, null, _date_of_birth_decorators, { kind: "field", name: "date_of_birth", static: false, private: false, access: { has: function (obj) { return "date_of_birth" in obj; }, get: function (obj) { return obj.date_of_birth; }, set: function (obj, value) { obj.date_of_birth = value; } }, metadata: _metadata }, _date_of_birth_initializers, _date_of_birth_extraInitializers);
        __esDecorate(null, null, _gender_decorators, { kind: "field", name: "gender", static: false, private: false, access: { has: function (obj) { return "gender" in obj; }, get: function (obj) { return obj.gender; }, set: function (obj, value) { obj.gender = value; } }, metadata: _metadata }, _gender_initializers, _gender_extraInitializers);
        __esDecorate(null, null, _phone_decorators, { kind: "field", name: "phone", static: false, private: false, access: { has: function (obj) { return "phone" in obj; }, get: function (obj) { return obj.phone; }, set: function (obj, value) { obj.phone = value; } }, metadata: _metadata }, _phone_initializers, _phone_extraInitializers);
        __esDecorate(null, null, _preferences_decorators, { kind: "field", name: "preferences", static: false, private: false, access: { has: function (obj) { return "preferences" in obj; }, get: function (obj) { return obj.preferences; }, set: function (obj, value) { obj.preferences = value; } }, metadata: _metadata }, _preferences_initializers, _preferences_extraInitializers);
        __esDecorate(null, null, _language_preference_decorators, { kind: "field", name: "language_preference", static: false, private: false, access: { has: function (obj) { return "language_preference" in obj; }, get: function (obj) { return obj.language_preference; }, set: function (obj, value) { obj.language_preference = value; } }, metadata: _metadata }, _language_preference_initializers, _language_preference_extraInitializers);
        __esDecorate(null, null, _profile_picture_decorators, { kind: "field", name: "profile_picture", static: false, private: false, access: { has: function (obj) { return "profile_picture" in obj; }, get: function (obj) { return obj.profile_picture; }, set: function (obj, value) { obj.profile_picture = value; } }, metadata: _metadata }, _profile_picture_initializers, _profile_picture_extraInitializers);
        __esDecorate(null, null, _addresses_decorators, { kind: "field", name: "addresses", static: false, private: false, access: { has: function (obj) { return "addresses" in obj; }, get: function (obj) { return obj.addresses; }, set: function (obj, value) { obj.addresses = value; } }, metadata: _metadata }, _addresses_initializers, _addresses_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: function (obj) { return "createdAt" in obj; }, get: function (obj) { return obj.createdAt; }, set: function (obj, value) { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: function (obj) { return "updatedAt" in obj; }, get: function (obj) { return obj.updatedAt; }, set: function (obj, value) { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ProfileClient = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ProfileClient = _classThis;
}();
exports.ProfileClient = ProfileClient;

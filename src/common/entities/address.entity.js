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
exports.Address = exports.AddressTag = void 0;
var typeorm_1 = require("typeorm");
var profile_client_entity_1 = require("@/client/profile/entities/profile-client.entity");
var profile_expert_entity_1 = require("../../expert/profile/entities/profile-expert.entity");
var AddressTag;
(function (AddressTag) {
    AddressTag["HOME"] = "home";
    AddressTag["OFFICE"] = "office";
    AddressTag["BILLING"] = "billing";
    AddressTag["SHIPPING"] = "shipping";
    AddressTag["OTHER"] = "other";
})(AddressTag || (exports.AddressTag = AddressTag = {}));
var Address = function () {
    var _classDecorators = [(0, typeorm_1.Entity)({ name: 'addresses' }), (0, typeorm_1.Unique)(['profile_client', 'tag']), (0, typeorm_1.Unique)(['profile_expert', 'tag'])];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _line1_decorators;
    var _line1_initializers = [];
    var _line1_extraInitializers = [];
    var _city_decorators;
    var _city_initializers = [];
    var _city_extraInitializers = [];
    var _state_decorators;
    var _state_initializers = [];
    var _state_extraInitializers = [];
    var _country_decorators;
    var _country_initializers = [];
    var _country_extraInitializers = [];
    var _zipCode_decorators;
    var _zipCode_initializers = [];
    var _zipCode_extraInitializers = [];
    var _tag_decorators;
    var _tag_initializers = [];
    var _tag_extraInitializers = [];
    var _profile_client_decorators;
    var _profile_client_initializers = [];
    var _profile_client_extraInitializers = [];
    var _profile_expert_decorators;
    var _profile_expert_initializers = [];
    var _profile_expert_extraInitializers = [];
    var Address = _classThis = /** @class */ (function () {
        function Address_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            // Map property "line1" to DB column "street"
            this.line1 = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _line1_initializers, void 0));
            this.city = (__runInitializers(this, _line1_extraInitializers), __runInitializers(this, _city_initializers, void 0));
            this.state = (__runInitializers(this, _city_extraInitializers), __runInitializers(this, _state_initializers, void 0));
            this.country = (__runInitializers(this, _state_extraInitializers), __runInitializers(this, _country_initializers, void 0));
            // Map property "zipCode" to DB column "postal_code"
            this.zipCode = (__runInitializers(this, _country_extraInitializers), __runInitializers(this, _zipCode_initializers, void 0));
            this.tag = (__runInitializers(this, _zipCode_extraInitializers), __runInitializers(this, _tag_initializers, void 0));
            this.profile_client = (__runInitializers(this, _tag_extraInitializers), __runInitializers(this, _profile_client_initializers, void 0));
            this.profile_expert = (__runInitializers(this, _profile_client_extraInitializers), __runInitializers(this, _profile_expert_initializers, void 0));
            __runInitializers(this, _profile_expert_extraInitializers);
        }
        return Address_1;
    }());
    __setFunctionName(_classThis, "Address");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _line1_decorators = [(0, typeorm_1.Column)({ name: 'street', type: 'varchar', length: 255 })];
        _city_decorators = [(0, typeorm_1.Column)({ type: 'varchar', length: 100 })];
        _state_decorators = [(0, typeorm_1.Column)({ type: 'varchar', length: 100 })];
        _country_decorators = [(0, typeorm_1.Column)({ type: 'varchar', length: 100 })];
        _zipCode_decorators = [(0, typeorm_1.Column)({ name: 'postal_code', type: 'varchar', length: 10, nullable: true })];
        _tag_decorators = [(0, typeorm_1.Column)({
                type: 'enum',
                enum: AddressTag,
                default: AddressTag.OTHER,
            })];
        _profile_client_decorators = [(0, typeorm_1.ManyToOne)(function () { return profile_client_entity_1.ProfileClient; }, function (profile) { return profile.addresses; }, {
                nullable: true,
                onDelete: 'CASCADE',
            }), (0, typeorm_1.JoinColumn)({ name: 'profile_client_id' })];
        _profile_expert_decorators = [(0, typeorm_1.ManyToOne)(function () { return profile_expert_entity_1.ProfileExpert; }, function (profile) { return profile.addresses; }, {
                nullable: true,
                onDelete: 'CASCADE',
            }), (0, typeorm_1.JoinColumn)({ name: 'profile_expert_id' })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _line1_decorators, { kind: "field", name: "line1", static: false, private: false, access: { has: function (obj) { return "line1" in obj; }, get: function (obj) { return obj.line1; }, set: function (obj, value) { obj.line1 = value; } }, metadata: _metadata }, _line1_initializers, _line1_extraInitializers);
        __esDecorate(null, null, _city_decorators, { kind: "field", name: "city", static: false, private: false, access: { has: function (obj) { return "city" in obj; }, get: function (obj) { return obj.city; }, set: function (obj, value) { obj.city = value; } }, metadata: _metadata }, _city_initializers, _city_extraInitializers);
        __esDecorate(null, null, _state_decorators, { kind: "field", name: "state", static: false, private: false, access: { has: function (obj) { return "state" in obj; }, get: function (obj) { return obj.state; }, set: function (obj, value) { obj.state = value; } }, metadata: _metadata }, _state_initializers, _state_extraInitializers);
        __esDecorate(null, null, _country_decorators, { kind: "field", name: "country", static: false, private: false, access: { has: function (obj) { return "country" in obj; }, get: function (obj) { return obj.country; }, set: function (obj, value) { obj.country = value; } }, metadata: _metadata }, _country_initializers, _country_extraInitializers);
        __esDecorate(null, null, _zipCode_decorators, { kind: "field", name: "zipCode", static: false, private: false, access: { has: function (obj) { return "zipCode" in obj; }, get: function (obj) { return obj.zipCode; }, set: function (obj, value) { obj.zipCode = value; } }, metadata: _metadata }, _zipCode_initializers, _zipCode_extraInitializers);
        __esDecorate(null, null, _tag_decorators, { kind: "field", name: "tag", static: false, private: false, access: { has: function (obj) { return "tag" in obj; }, get: function (obj) { return obj.tag; }, set: function (obj, value) { obj.tag = value; } }, metadata: _metadata }, _tag_initializers, _tag_extraInitializers);
        __esDecorate(null, null, _profile_client_decorators, { kind: "field", name: "profile_client", static: false, private: false, access: { has: function (obj) { return "profile_client" in obj; }, get: function (obj) { return obj.profile_client; }, set: function (obj, value) { obj.profile_client = value; } }, metadata: _metadata }, _profile_client_initializers, _profile_client_extraInitializers);
        __esDecorate(null, null, _profile_expert_decorators, { kind: "field", name: "profile_expert", static: false, private: false, access: { has: function (obj) { return "profile_expert" in obj; }, get: function (obj) { return obj.profile_expert; }, set: function (obj, value) { obj.profile_expert = value; } }, metadata: _metadata }, _profile_expert_initializers, _profile_expert_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Address = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Address = _classThis;
}();
exports.Address = Address;

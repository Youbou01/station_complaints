from enum import Enum


class RoleEnum(str, Enum):
    """
    The 5 roles in the station complaints system.
    
    - administrator: You! Controls the whole system.
    - manager: Works at a station, reports complaints.
    - assistant: Works at SNDP Agil, manages complaints for assigned stations.
    - intervenant: Department head, resolves complaints in their domain.
    - director: Reviews work, rates intervenants.
    """
    ADMINISTRATOR = "administrator"
    MANAGER = "manager"
    ASSISTANT = "assistant"
    INTERVENANT = "intervenant"
    DIRECTOR = "director"


class ComplaintTypeEnum(str, Enum):
    """
    Types of complaints that can be reported.
    """
    TECHNICAL = "technical"
    MECHANICAL = "mechanical"
    OIL_RELATED = "oil_related"
    SAFETY = "safety"
    ADMINISTRATIVE = "administrative"


class ComplaintStatusEnum(str, Enum):
    """
    The lifecycle status of a complaint.
    """
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    ON_HOLD = "on_hold"
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConsoleShell } from "@/components/console-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  insertServiceCallSchema,
  type InsertServiceCall,
  type ServiceCall,
  type SafeUser,
} from "@shared/schema";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const SYSTEM_TYPES = [
  "AHU",
  "VAV",
  "Chiller",
  "Boiler",
  "BAS Controller",
  "RTU",
  "Pump",
  "Other",
] as const;

export default function NewCallPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const usersQ = useQuery<SafeUser[]>({ queryKey: ["/api/users"] });
  const technicians = (usersQ.data ?? []).filter(
    (u) => u.role === "technician" || u.role === "admin",
  );

  const form = useForm<InsertServiceCall>({
    resolver: zodResolver(insertServiceCallSchema),
    defaultValues: {
      siteName: "",
      siteAddress: "",
      contactName: "",
      contactPhone: "",
      systemType: "AHU",
      symptom: "",
      description: "",
      priority: "normal",
      status: "new",
      assignedToId: null,
    },
  });

  const create = useMutation({
    mutationFn: async (values: InsertServiceCall) => {
      const res = await apiRequest("POST", "/api/service-calls", values);
      return (await res.json()) as ServiceCall;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-calls"] });
      toast({ title: "Service call created", description: created.ticketNumber });
      navigate(`/calls/${created.id}`);
    },
    onError: (e: any) => {
      toast({
        title: "Could not create service call",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <ConsoleShell>
      <div className="px-5 md:px-8 pt-6 pb-4 border-b border-border">
        <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          Intake
        </div>
        <h1 className="text-xl font-semibold mt-1">New service call</h1>
        <div className="console-rule mt-4" />
      </div>

      <div className="px-5 md:px-8 py-6 max-w-3xl">
        <Card className="p-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => create.mutate(v))}
              className="space-y-4"
              data-testid="form-new-call"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="siteName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-site-name"
                          placeholder="Riverside Medical Tower"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="siteAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site address</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-site-address"
                          placeholder="1820 W Riverside Dr, Boise ID"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-contact-name"
                          placeholder="Facilities lead"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact phone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-contact-phone"
                          placeholder="(555) 555-1234"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="systemType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-system-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SYSTEM_TYPES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assignedToId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to (optional)</FormLabel>
                      <Select
                        value={field.value == null ? "none" : String(field.value)}
                        onValueChange={(v) =>
                          field.onChange(v === "none" ? null : Number(v))
                        }
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-assign-to">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {technicians.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.name} · {t.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="symptom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symptom</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        data-testid="input-symptom"
                        placeholder="Supply air drift / VAV stuck / boiler lockout"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={5}
                        data-testid="input-description"
                        placeholder="What is the customer reporting? Any trends, alarm history, or scope notes?"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/")}
                  data-testid="button-cancel-new-call"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={create.isPending}
                  data-testid="button-create-call"
                >
                  {create.isPending ? "Creating…" : "Create service call"}
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </ConsoleShell>
  );
}
